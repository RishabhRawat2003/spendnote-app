package expo.modules.paymentdetector

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/** Runs in the app process even when SpendNote is closed, as long as the user granted notification access. */
class PaymentNotificationListener : NotificationListenerService() {
  override fun onListenerConnected() {
    super.onListenerConnected()
    connected = true
    PaymentStore.markConnected(applicationContext, true)
    catchUp()
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    connected = false
    PaymentStore.markConnected(applicationContext, false)
    rebind(applicationContext)
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn != null) process(sbn)
  }

  /** Payments made while the listener was unbound may still be sitting in the shade. */
  private fun catchUp() {
    val since = System.currentTimeMillis() - CATCH_UP_WINDOW_MS
    try {
      activeNotifications?.filter { it.postTime >= since }?.sortedBy { it.postTime }?.forEach { process(it) }
    } catch (e: Exception) {
      Log.w(TAG, "Couldn't read active notifications", e)
    }
  }

  private fun process(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName || !PaymentProcessor.isRelevant(sbn.packageName)) return

    val notification = sbn.notification ?: return
    if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return

    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    // Gmail puts the subject/snippet across TEXT, BIG_TEXT, SUB_TEXT and INFO_TEXT.
    val text = (latestMessage(extras)
      ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_SUB_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_INFO_TEXT))?.toString()
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
    // When Gmail title is the subject, the sender is often in SUB_TEXT — merge so mailSource can match.
    val from = when {
      sbn.packageName in PaymentProcessor.MAIL_APPS && !subText.isNullOrBlank() && subText != text ->
        listOfNotNull(title, subText).joinToString("\n")
      else -> title
    }

    try {
      PaymentProcessor.handle(applicationContext, sbn.packageName, from, text, sbn.postTime)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to process payment notification", e)
    }
  }

  /** SMS apps use MessagingStyle, where EXTRA_TEXT can be a summary like "2 new messages". */
  @Suppress("DEPRECATION")
  private fun latestMessage(extras: Bundle): CharSequence? {
    val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES) ?: return null
    return (messages.lastOrNull() as? Bundle)?.getCharSequence("text")
  }

  companion object {
    private const val TAG = "SpendNote"
    private const val CATCH_UP_WINDOW_MS = 15 * 60_000L

    /** True while Android has this service bound; the service lives in the app process. */
    @Volatile
    var connected = false
      private set

    fun component(context: Context) = ComponentName(context, PaymentNotificationListener::class.java)

    fun rebind(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
      try {
        NotificationListenerService.requestRebind(component(context))
      } catch (e: Exception) {
        Log.w(TAG, "requestRebind failed", e)
      }
    }
  }
}
