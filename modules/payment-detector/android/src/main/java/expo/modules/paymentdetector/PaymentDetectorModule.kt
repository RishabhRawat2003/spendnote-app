package expo.modules.paymentdetector

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class PaymentDetectorModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PaymentDetector")

    Events("onPaymentDetected")

    OnCreate {
      active = WeakReference(this@PaymentDetectorModule)
    }

    OnDestroy {
      if (active?.get() === this@PaymentDetectorModule) active = null
    }

    Function("isListenerEnabled") {
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: ""
      enabled.split(":").any { it.startsWith("${context.packageName}/") }
    }

    Function("openListenerSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("getPendingPayments") {
      PaymentStore.pending(context)
    }

    Function("removePendingPayments") { ids: List<String> ->
      PaymentStore.remove(context, ids.toSet())
    }

    Function("configure") { enabled: Boolean, minAmountPaise: Double ->
      PaymentStore.configure(context, enabled, minAmountPaise.toLong())
    }

    Function("simulatePayment") { packageName: String, title: String, text: String ->
      PaymentProcessor.handle(context, packageName, title, text, System.currentTimeMillis())
    }
  }

  companion object {
    @Volatile
    private var active: WeakReference<PaymentDetectorModule>? = null

    internal fun emit(payload: Map<String, Any?>) {
      active?.get()?.sendEvent("onPaymentDetected", payload)
    }
  }
}
