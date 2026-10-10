package expo.modules.paymentdetector

import android.content.Context
import org.json.JSONObject
import java.util.UUID

internal object PaymentProcessor {
  /** Package name of each supported app → SpendNote source id. */
  val SOURCES = mapOf(
    "com.google.android.apps.nbu.paisa.user" to "gpay",
    "com.phonepe.app" to "phonepe",
    "net.one97.paytm" to "paytm",
    "in.org.npci.upiapp" to "bhim",
    "indwin.c3.shareapp" to "slice_account",
    "com.canarabank.mobility" to "canara"
  )

  /** Returns true when the notification was recognised as a new payment. */
  fun handle(context: Context, packageName: String, title: String?, text: String?, postedAt: Long): Boolean {
    val source = SOURCES[packageName] ?: return false
    if (!PaymentStore.isEnabled(context)) return false

    val body = listOfNotNull(title, text).filter { it.isNotBlank() }.joinToString("\n")
    val parsed = PaymentParser.parse(body) ?: return false
    val merchant = parsed.merchant ?: title?.takeIf { PaymentParser.parse(it) == null }?.trim()?.take(40)

    val fingerprint = "$packageName|${parsed.amountPaise}|${parsed.type}|$merchant|${postedAt / 120_000}"
    if (!PaymentStore.markSeen(context, fingerprint)) return false

    val id = UUID.randomUUID().toString()
    val event = JSONObject()
      .put("id", id)
      .put("source", source)
      .put("packageName", packageName)
      .put("title", title ?: JSONObject.NULL)
      .put("text", text ?: JSONObject.NULL)
      .put("amount", parsed.amountPaise)
      .put("type", parsed.type)
      .put("merchant", merchant ?: JSONObject.NULL)
      .put("upiId", parsed.upiId ?: JSONObject.NULL)
      .put("postedAt", postedAt)

    PaymentStore.enqueue(context, event)

    if (parsed.type == "debit" && parsed.amountPaise >= PaymentStore.minAmountPaise(context)) {
      PromptNotifier.show(context, id, parsed.amountPaise, merchant)
    }

    PaymentDetectorModule.emit(event.toMap())
    return true
  }
}
