package expo.modules.paymentdetector

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/** Runs in the app process even when SpendNote is closed, as long as the user granted notification access. */
class PaymentNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null || sbn.packageName == packageName) return
    if (sbn.packageName !in PaymentProcessor.SOURCES) return

    val notification = sbn.notification ?: return
    if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return

    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
      ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()

    try {
      PaymentProcessor.handle(applicationContext, sbn.packageName, title, text, sbn.postTime)
    } catch (e: Exception) {
      Log.w("SpendNote", "Failed to process payment notification", e)
    }
  }
}
