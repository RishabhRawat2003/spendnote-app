package expo.modules.paymentdetector

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
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
      isListenerEnabled(context)
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

    Function("setOwnerName") { name: String ->
      PaymentStore.setOwnerName(context, name)
    }

    Function("simulatePayment") { packageName: String, title: String, text: String ->
      PaymentProcessor.handle(context, packageName, title, text, System.currentTimeMillis())
    }

    Function("getDiagnostics") {
      PaymentStore.diagnostics(context) + mapOf(
        "listenerEnabled" to isListenerEnabled(context),
        "listenerConnected" to PaymentNotificationListener.connected
      )
    }

    Function("getActivity") {
      PaymentStore.activity(context)
    }

    Function("clearActivity") {
      PaymentStore.clearActivity(context)
    }

    /**
     * Android sometimes leaves the listener unbound after an install or update even though access is
     * granted. Toggling the component forces the system to bind it again.
     */
    Function("reconnect") {
      if (!isListenerEnabled(context) || PaymentNotificationListener.connected) return@Function false
      val pm = context.packageManager
      val component = PaymentNotificationListener.component(context)
      pm.setComponentEnabledSetting(component, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      pm.setComponentEnabledSetting(component, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
      PaymentNotificationListener.rebind(context)
      true
    }
  }

  private fun isListenerEnabled(context: Context): Boolean {
    val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: ""
    return enabled.split(":").any { it.startsWith("${context.packageName}/") }
  }

  companion object {
    @Volatile
    private var active: WeakReference<PaymentDetectorModule>? = null

    internal fun emit(payload: Map<String, Any?>) {
      active?.get()?.sendEvent("onPaymentDetected", payload)
    }
  }
}
