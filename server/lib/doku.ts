import crypto from 'node:crypto'

export interface DokuPaymentItem {
  name: string
  price: number
  quantity: number
}

export interface CreateDokuPaymentParams {
  bookingId: number
  clientName: string
  clientEmail: string
  clientPhone: string
  packageName: string
  depositAmount: number
}

export function getDokuConfig() {
  const clientId = process.env.DOKU_CLIENT_ID || 'doku_key_75d8f047fafb40d6b7f0986799b65556'
  const secretKey = process.env.DOKU_SECRET_KEY || 'SK-JrDIUeOJJ0xlTpUYpZ8A'
  const isProduction = process.env.DOKU_IS_PRODUCTION === 'true'
  const baseUrl = isProduction
    ? 'https://api.doku.com'
    : 'https://api-sandbox.doku.com'

  return { clientId, secretKey, isProduction, baseUrl }
}

export function generateDokuSignature(
  clientId: string,
  secretKey: string,
  requestId: string,
  requestTimestamp: string,
  requestTarget: string,
  bodyString: string
) {
  // Digest = Base64(SHA256(bodyString))
  const hash = crypto.createHash('sha256').update(bodyString).digest()
  const digest = hash.toString('base64')

  const stringToSign = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${requestTarget}\nDigest:${digest}`
  
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest()
  
  return `HMACSHA256=${hmac.toString('base64')}`
}

export async function createDokuCheckoutPayment(params: CreateDokuPaymentParams) {
  const { clientId, secretKey, baseUrl } = getDokuConfig()
  const requestId = `REQ-${params.bookingId}-${Date.now()}`
  const requestTimestamp = new Date().toISOString().slice(0, 19) + 'Z'
  const requestTarget = '/checkout/v1/payment'
  const invoiceNumber = `INV-CB-${params.bookingId}-${Date.now()}`

  // App host for callback redirect
  const appUrl = process.env.APP_URL || 'https://chicbeauty.codzy.net'

  const body = {
    order: {
      invoice_number: invoiceNumber,
      amount: params.depositAmount,
      line_items: [
        {
          name: `Deposit 50% ${params.packageName} — ChicBeauty`,
          price: params.depositAmount,
          quantity: 1,
        },
      ],
      callback_url: `${appUrl}/booking/${params.bookingId}`,
      auto_redirect: true,
    },
    payment: {
      payment_due_date: 120, // 2 jam sesuai aturan deposit PRD
    },
    customer: {
      id: `CUST-${params.bookingId}`,
      name: params.clientName,
      email: params.clientEmail,
      phone: params.clientPhone,
    },
  }

  const bodyString = JSON.stringify(body)
  const signature = generateDokuSignature(
    clientId,
    secretKey,
    requestId,
    requestTimestamp,
    requestTarget,
    bodyString
  )

  try {
    const response = await fetch(`${baseUrl}${requestTarget}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': requestTimestamp,
        Signature: signature,
      },
      body: bodyString,
    })

    const data = (await response.json()) as Record<string, any>
    console.log('[DOKU Checkout Response]', { status: response.status, data })

    if (data?.response?.payment?.url) {
      return {
        success: true,
        paymentUrl: data.response.payment.url,
        invoiceNumber,
      }
    } else {
      return {
        success: false,
        error: data?.error?.message || data?.message || 'Gagal membuat sesi pembayaran DOKU',
        detail: data,
      }
    }
  } catch (err) {
    console.error('[DOKU Checkout Error]', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem DOKU',
    }
  }
}
