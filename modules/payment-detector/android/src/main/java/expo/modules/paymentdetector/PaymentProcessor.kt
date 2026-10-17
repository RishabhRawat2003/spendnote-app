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

  /**
   * SMS apps. UPI apps often stay silent after an in-app payment, but the bank always sends an SMS,
   * and its notification arrives here without needing the READ_SMS permission.
   */
  val SMS_APPS = setOf(
    "com.google.android.apps.messaging",
    "com.samsung.android.messaging",
    "com.android.mms",
    "com.android.messaging",
    "com.oneplus.mms",
    "com.oplus.mms",
    "com.coloros.mms",
    "com.miui.mms",
    "com.truecaller"
  )

  /**
   * Mail apps. When the SMS never arrives, slice (and other banks later) often still email a
   * transaction alert. Only messages from known senders are read; everything else is ignored.
   */
  val MAIL_APPS = setOf(
    "com.google.android.gm",
    "com.google.android.apps.gmail",
    "com.samsung.android.email.provider",
    "com.microsoft.office.outlook",
    "com.yahoo.mobile.client.android.mail"
  )

  private val APP_LABELS = mapOf(
    "gpay" to "Google Pay",
    "phonepe" to "PhonePe",
    "paytm" to "Paytm",
    "bhim" to "BHIM",
    "slice_account" to "slice",
    "slice_card" to "slice",
    "canara" to "Canara Bank"
  )

  private val canaraSms = Regex("""canbnk|canara""", RegexOption.IGNORE_CASE)
  private val sliceSms = Regex("""\bsl(?:i)?ce|nesfb""", RegexOption.IGNORE_CASE)
  /** slice transaction emails: domain in the From line, or the brand as the notification title. */
  private val sliceMail = Regex(
    """@sliceit\.com|@slice\.it|@slice\.co|@nesfb\.com|\bsliceit\.com\b|\bnesfb\.com\b""",
    RegexOption.IGNORE_CASE
  )
  private val sliceMailSender = Regex(
    """^(?:slice(?:it)?|north\s*east\s*small\s*finance(?:\s+bank)?)(?:\s|$|<)""",
    RegexOption.IGNORE_CASE
  )
  /** DLT sender headers: "VM-HDFCBK", "JD-SBIUPI-S", "AXISBK". */
  private val senderId = Regex("""^(?:[A-Z]{2}-)?[A-Z0-9]{5,8}(?:-[A-Z])?$""")
  private val cardWord = Regex("""\bcard\b""", RegexOption.IGNORE_CASE)
  private val phoneNumber = Regex("""\+?[0-9][0-9 ()-]{6,}""")
  /** Account/card last-4 from bank SMS: "A/c XX1234", "XXXX1234", "a/c ending 1234". */
  private val last4Digits = Regex(
    """(?:a/?c|account|card|xxxx|xx|ending)\s*(?:no\.?|number)?\s*[*xX]*\s*(\d{4})\b""",
    RegexOption.IGNORE_CASE
  )

  fun isRelevant(packageName: String) =
    packageName in SOURCES || packageName in SMS_APPS || packageName in MAIL_APPS

  /** Returns true when the notification was recognised as a new payment. */
  fun handle(context: Context, packageName: String, title: String?, text: String?, postedAt: Long): Boolean {
    val isSms = packageName in SMS_APPS
    val isMail = packageName in MAIL_APPS
    val privateChannel = isSms || isMail

    val bankSource = when {
      isSms -> smsSource(title, text)
      isMail -> mailSource(title, text)
      else -> null
    }
    // Personal SMS/email are ignored silently and never logged.
    if (privateChannel && bankSource == null) {
      if (isSms) logUnsupportedBank(context, title, text, postedAt)
      return false
    }
    var source = bankSource ?: SOURCES[packageName] ?: return false

    val channelLabel = when {
      isMail -> "${APP_LABELS[source]} email"
      isSms -> "${APP_LABELS[source]} SMS"
      else -> APP_LABELS[source]
    }
    val activity = JSONObject()
      .put("source", source)
      .put("app", channelLabel)
      .put("postedAt", postedAt)
    if (!privateChannel) activity.put("preview", preview(title, text))

    if (!PaymentStore.isEnabled(context)) {
      PaymentStore.log(context, activity.put("outcome", "disabled").put("detail", "Detection is turned off"))
      return false
    }

    val body = listOfNotNull(title, text).filter { it.isNotBlank() }.joinToString("\n")
    val parsed = when (val result = PaymentParser.analyse(body)) {
      is ParseResult.Skipped -> {
        PaymentStore.log(context, activity.put("outcome", "skipped").put("detail", result.reason))
        return false
      }
      is ParseResult.Payment -> result.payment
    }

    // SMS/email titles are the sender, never the merchant.
    val merchant = when {
      parsed.transfer == TransferKind.CARD_REPAYMENT -> "Card bill payment"
      parsed.merchant != null -> parsed.merchant
      privateChannel -> null
      else -> title?.takeIf { PaymentParser.parse(it) == null }?.trim()?.take(40)
    }

    var type = parsed.type
    // slice reports a bill payment as "payment received for your card": money arriving on the card.
    if (parsed.transfer == TransferKind.CARD_REPAYMENT && source.startsWith("slice")) {
      source = "slice_card"
      type = "credit"
    }

    val id = UUID.randomUUID().toString()
    val recent = RecentPayment(id, packageName, source, parsed.amountPaise, type, merchant, postedAt)

    activity.put("source", source).put("amount", parsed.amountPaise).put("type", type).put("merchant", merchant ?: JSONObject.NULL)

    if (PaymentStore.isDuplicate(context, recent)) {
      PaymentStore.log(context, activity.put("outcome", "duplicate").put("detail", "Already captured from another notification"))
      return false
    }

    val counterpartId = PaymentStore.findCounterpart(context, recent)
    val isTransfer = parsed.transfer != null || counterpartId != null || isOwnName(context, merchant)
    PaymentStore.remember(context, recent)

    val last4 = last4Digits.find(body)?.groupValues?.getOrNull(1)

    val event = JSONObject()
      .put("id", id)
      .put("source", source)
      .put("packageName", packageName)
      .put("title", if (privateChannel) JSONObject.NULL else (title ?: JSONObject.NULL))
      .put("text", if (privateChannel) JSONObject.NULL else (text ?: JSONObject.NULL))
      .put("amount", parsed.amountPaise)
      .put("type", type)
      .put("merchant", merchant ?: JSONObject.NULL)
      .put("upiId", parsed.upiId ?: JSONObject.NULL)
      .put("postedAt", postedAt)
      .put("isTransfer", isTransfer)
      .put("last4", last4 ?: JSONObject.NULL)

    PaymentStore.enqueue(context, event)
    if (counterpartId != null) {
      PaymentStore.markQueuedAsTransfer(context, counterpartId)
      // The first half of the transfer may already have asked "What was this for?".
      PromptNotifier.cancel(context, counterpartId)
    }
    val detail = when {
      parsed.transfer == TransferKind.CARD_REPAYMENT -> "Card bill payment · saved as a transfer"
      isTransfer -> "Transfer between your accounts"
      isMail -> "Captured from email"
      type == "credit" -> "Added as money received"
      else -> "Added to Untagged"
    }
    PaymentStore.log(context, activity.put("outcome", "saved").put("detail", detail).put("isTransfer", isTransfer))

    if (!isTransfer && type == "debit" && parsed.amountPaise >= PaymentStore.minAmountPaise(context)) {
      PromptNotifier.show(context, id, parsed.amountPaise, merchant)
    }

    PaymentDetectorModule.emit(event.toMap())
    return true
  }

  /** Maps an SMS to a bank SpendNote tracks, or null for everything else. */
  private fun smsSource(sender: String?, body: String?): String? {
    val from = sender.orEmpty()
    val message = body.orEmpty()
    // Banks send from DLT headers like "VM-CANBNK", never from a phone number.
    if (phoneNumber.matches(from.trim())) return null
    val slice = { if (cardWord.containsMatchIn(message)) "slice_card" else "slice_account" }
    // The sender decides first: a slice SMS can say "received from CANARA BANK".
    return when {
      canaraSms.containsMatchIn(from) -> "canara"
      sliceSms.containsMatchIn(from) -> slice()
      canaraSms.containsMatchIn(message) -> "canara"
      sliceSms.containsMatchIn(message) -> slice()
      else -> null
    }
  }

  /**
   * Maps a Gmail (or other mail) notification to slice when the From line or title looks like a
   * slice alert. Personal mail is never matched.
   */
  private fun mailSource(sender: String?, body: String?): String? {
    val from = sender.orEmpty().trim()
    val message = body.orEmpty()
    val haystack = "$from\n$message"
    if (!sliceMail.containsMatchIn(haystack) && !sliceMailSender.containsMatchIn(from)) return null
    return if (cardWord.containsMatchIn(message) || cardWord.containsMatchIn(from)) "slice_card" else "slice_account"
  }

  /**
   * A bank SMS from a bank SpendNote doesn't track yet. Only the sender id (like "JD-HDFCBK") is
   * logged, never the message, so the user can tell which bank to add.
   */
  private fun logUnsupportedBank(context: Context, sender: String?, body: String?, postedAt: Long) {
    val from = sender?.trim().orEmpty()
    if (from.isEmpty() || phoneNumber.matches(from) || !senderId.matches(from)) return
    val parsed = PaymentParser.parse(body.orEmpty()) ?: return
    PaymentStore.log(
      context,
      JSONObject()
        .put("source", "unknown")
        .put("app", "SMS from $from")
        .put("postedAt", postedAt)
        .put("amount", parsed.amountPaise)
        .put("type", parsed.type)
        .put("outcome", "skipped")
        .put("detail", "This bank isn’t supported yet")
    )
  }

  /** "Rishabh Rawat" paying "RISHABH RAWAT" is moving money between their own accounts. */
  private fun isOwnName(context: Context, counterparty: String?): Boolean {
    if (counterparty == null) return false
    val ownTokens = nameTokens(PaymentStore.ownerName(context))
    if (ownTokens.isEmpty()) return false
    val theirTokens = nameTokens(counterparty).toSet()
    return if (ownTokens.size == 1) theirTokens == ownTokens.toSet() else ownTokens.all { it in theirTokens }
  }

  private fun nameTokens(name: String): List<String> =
    name.lowercase().split(Regex("""[^a-z]+""")).filter { it.length >= 3 }

  private fun preview(title: String?, text: String?): String =
    listOfNotNull(title, text).filter { it.isNotBlank() }.joinToString(" · ").replace(Regex("""\s+"""), " ").take(90)
}
