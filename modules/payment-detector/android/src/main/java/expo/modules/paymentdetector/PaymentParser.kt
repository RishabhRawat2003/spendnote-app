package expo.modules.paymentdetector

/** Pulls amount, direction and counterparty out of a payment notification or bank SMS. */
internal data class ParsedPayment(
  val amountPaise: Long,
  val type: String,
  val merchant: String?,
  val upiId: String?,
  /** Set when the wording says money moved between the user's own accounts. */
  val transfer: TransferKind? = null
)

internal enum class TransferKind { CARD_REPAYMENT, SELF }

internal sealed class ParseResult {
  data class Payment(val payment: ParsedPayment) : ParseResult()
  data class Skipped(val reason: String) : ParseResult()
}

internal object PaymentParser {
  private val opts = setOf(RegexOption.IGNORE_CASE)

  private val amountRegex = Regex("""(?:₹|\brs\.?|\binr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""", opts)
  private val debitRegex = Regex("""\b(paid|sent|debited|spent|transferred|deducted|withdrawn|charged|payment of|transfer of|purchase)\b""", opts)
  private val creditRegex = Regex("""\b(received|credited|refunded|refund|deposited|added|loaded)\b""", opts)
  /** "Rahul paid you ₹300" is money coming in, even though it says "paid". */
  private val paidYouRegex = Regex(
    """^(.*?)\s*(?:has\s+)?\b(?:paid|sent|transferred)\s+you\b""",
    setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE)
  )

  /** Never a completed payment, whatever else the message says. */
  private val hardIgnoreRegex = Regex(
    """\b(requests?|requested|collect request|failed|declined|unsuccessful|otp|one time password|pending|reversed|will be debited)\b""",
    opts
  )
  /** Paying a card bill: a transfer to the card, not new spending (the purchases were already counted). */
  private val cardRepaymentRegex = Regex(
    """\b(?:repayment|repaid)\b|\b(?:received|credited)\s+(?:for|towards|to|against)\s+(?:the\s+|your\s+)?(?:[\w-]+\s+){0,3}card\b|\bcard\s+(?:bill|dues|outstanding)\b""",
    opts
  )
  private val selfTransferRegex = Regex(
    """\bself[\s-]?transfer\b|\bto\s+self\b|\bown\s+(?:a/c|account)\b|\b(?:add(?:ed)?|load(?:ed)?)\s+money\b|\bmoney\s+(?:added|loaded)\b|\btop[\s-]?up\b|\badded\s+to\s+your\b""",
    opts
  )
  /** Promotional words; only skip when the message has no clear money-moved verb. */
  private val softIgnoreRegex = Regex("""\b(due|reminder|offers?|cashback|rewards?|expir\w*|autopay set|won|win|off)\b""", opts)
  private val strongVerbRegex = Regex("""\b(debited|credited|paid|sent|spent|received|deducted|withdrawn|charged)\b""", opts)

  private val toRegex = Regex("""\b(?:to|at)\s+(.+?)(?=\s+(?:on|via|using|from|ref|upi|for|with|a/c|ac)\b|[.,!|\n]|$)""", opts)
  private val fromRegex = Regex("""\b(?:from|by)\s+(.+?)(?=\s+(?:on|via|using|to|ref|upi|in|into|a/c|ac)\b|[.,!|\n]|$)""", opts)
  private val upiRegex = Regex("""[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}""")
  /** Payment rails and references, not a person or shop. */
  private val railRegex = Regex("""^(?:upi|neft|imps|rtgs|ref|txn|transfer)\b.*""")

  fun parse(raw: String): ParsedPayment? = (analyse(raw) as? ParseResult.Payment)?.payment

  fun analyse(raw: String): ParseResult {
    val text = raw.replace(Regex("""[ \t\u00A0]+"""), " ").trim()
    if (text.isEmpty()) return ParseResult.Skipped("Empty notification")
    if (hardIgnoreRegex.containsMatchIn(text)) return ParseResult.Skipped("Not a completed payment (request, failed, OTP or reminder)")
    if (softIgnoreRegex.containsMatchIn(text) && !strongVerbRegex.containsMatchIn(text)) {
      return ParseResult.Skipped("Looks like an offer or reminder")
    }

    val amountMatch = amountRegex.find(text) ?: return ParseResult.Skipped("No amount found")
    val rupees = amountMatch.groupValues[1].replace(",", "").toDoubleOrNull()
    if (rupees == null || rupees <= 0.0) return ParseResult.Skipped("No amount found")

    val paidYou = paidYouRegex.find(text)
    val debit = debitRegex.find(text)
    val credit = creditRegex.find(text)
    val type = when {
      paidYou != null -> "credit"
      debit != null && credit != null -> if (debit.range.first <= credit.range.first) "debit" else "credit"
      debit != null -> "debit"
      credit != null -> "credit"
      else -> return ParseResult.Skipped("Couldn’t tell if money was paid or received")
    }

    val counterparty = when {
      paidYou != null -> paidYou.groupValues[1].lines().lastOrNull()
      type == "debit" -> toRegex.find(text)?.groupValues?.get(1)
      else -> fromRegex.find(text)?.groupValues?.get(1)
    }

    return ParseResult.Payment(
      ParsedPayment(
        amountPaise = Math.round(rupees * 100),
        type = type,
        merchant = counterparty?.let { cleanMerchant(it) },
        upiId = upiRegex.find(text)?.value,
        transfer = when {
          cardRepaymentRegex.containsMatchIn(text) -> TransferKind.CARD_REPAYMENT
          selfTransferRegex.containsMatchIn(text) -> TransferKind.SELF
          else -> null
        }
      )
    )
  }

  private fun cleanMerchant(value: String): String? {
    val cleaned = value
      .replace(Regex("""\b(successfully|succesfully)\b""", opts), "")
      .replace(Regex("""(?:₹|\brs\.?|\binr)\s*[0-9][0-9,.]*""", opts), "")
      .trim()
      .trim('-', ':', '·')
      .trim()
      .replace(Regex("""^(?:vpa|upi id|upi)\s+""", opts), "")
    val lower = cleaned.lowercase()
    if (cleaned.length < 2 || lower.startsWith("your ") || lower.startsWith("a/c") || lower.startsWith("ac ")) return null
    if (railRegex.matches(lower)) return null
    return cleaned.take(40)
  }
}
