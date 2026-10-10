package expo.modules.paymentdetector

/** Pulls amount, direction and counterparty out of a payment notification or bank SMS. */
internal data class ParsedPayment(
  val amountPaise: Long,
  val type: String,
  val merchant: String?,
  val upiId: String?
)

internal object PaymentParser {
  private val opts = setOf(RegexOption.IGNORE_CASE)

  private val amountRegex = Regex("""(?:₹|\brs\.?|\binr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""", opts)
  private val debitRegex = Regex("""\b(paid|sent|debited|spent|transferred|payment of|purchase)\b""", opts)
  private val creditRegex = Regex("""\b(received|credited|refunded|refund|deposited)\b""", opts)
  private val ignoreRegex = Regex(
    """\b(requests?|requested|collect|failed|declined|unsuccessful|due|reminder|offers?|cashback|rewards?|otp|pending|expir\w*|autopay set)\b""",
    opts
  )
  private val toRegex = Regex("""\b(?:to|at)\s+(.+?)(?=\s+(?:on|via|using|from|ref|upi|for|with|a/c|ac)\b|[.,!|\n]|$)""", opts)
  private val fromRegex = Regex("""\bfrom\s+(.+?)(?=\s+(?:on|via|using|to|ref|upi|in|into|a/c|ac)\b|[.,!|\n]|$)""", opts)
  private val upiRegex = Regex("""[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}""")

  fun parse(raw: String): ParsedPayment? {
    val text = raw.replace(Regex("""[ \t\u00A0]+"""), " ").trim()
    if (text.isEmpty() || ignoreRegex.containsMatchIn(text)) return null

    val amountMatch = amountRegex.find(text) ?: return null
    val rupees = amountMatch.groupValues[1].replace(",", "").toDoubleOrNull() ?: return null
    if (rupees <= 0.0) return null

    val debit = debitRegex.find(text)
    val credit = creditRegex.find(text)
    val type = when {
      debit != null && credit != null -> if (debit.range.first <= credit.range.first) "debit" else "credit"
      debit != null -> "debit"
      credit != null -> "credit"
      else -> return null
    }

    val upiId = upiRegex.find(text)?.value
    val counterparty = (if (type == "debit") toRegex else fromRegex).find(text)?.groupValues?.get(1)

    return ParsedPayment(
      amountPaise = Math.round(rupees * 100),
      type = type,
      merchant = counterparty?.let(::cleanMerchant),
      upiId = upiId
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
    if (cleaned.length < 2 || cleaned.lowercase().startsWith("your ")) return null
    return cleaned.take(40)
  }
}
