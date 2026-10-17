package expo.modules.paymentdetector

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import java.text.NumberFormat
import java.util.Locale

internal object PromptNotifier {
  private const val CHANNEL_ID = "payment_prompts"
  private const val BRAND_COLOR = 0xFF4F46E5.toInt()

  fun show(context: Context, id: String, amountPaise: Long, merchant: String?) {
    if (Build.VERSION.SDK_INT >= 33 &&
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL_ID, "Payment prompts", NotificationManager.IMPORTANCE_HIGH)
      channel.description = "Asks what a payment was for right after you pay"
      manager.createNotificationChannel(channel)
    }

    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("spendnote://untagged"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val pendingIntent = PendingIntent.getActivity(
      context,
      id.hashCode(),
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val title = if (merchant != null) "${formatRupees(amountPaise)} to $merchant" else "You paid ${formatRupees(amountPaise)}"

    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
    val notification = builder
      .setSmallIcon(R.drawable.spendnote_ic_notification)
      .setColor(BRAND_COLOR)
      .setContentTitle(title)
      .setContentText("What was this for? Tap to tag it.")
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_REMINDER)
      .build()

    try {
      manager.notify(id.hashCode(), notification)
    } catch (e: SecurityException) {
      Log.w("SpendNote", "Notification permission missing", e)
    }
  }

  fun cancel(context: Context, id: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(id.hashCode())
  }

  private fun formatRupees(paise: Long): String {
    val format = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    format.maximumFractionDigits = if (paise % 100 == 0L) 0 else 2
    format.minimumFractionDigits = format.maximumFractionDigits
    return format.format(paise / 100.0)
  }
}
