const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Manually load environment variables from .env if present
try {
  const envPath = path.join(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.trim().match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1)
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1)
        }
        process.env[key] = value
      }
    })
  }
} catch (e) {
  console.error('Error loading .env file:', e)
}

const purchaseId = process.argv[2]
const amountArg = process.argv[3] || '309.00' // default to 300 + 3% fee

if (!purchaseId) {
  console.error('Usage: node test-yoomoney-webhook.js <PURCHASE_ID> [AMOUNT]')
  process.exit(1)
}

const secret = process.env.YOOMONEY_SECRET

if (!secret) {
  console.error('Error: YOOMONEY_SECRET is not set in your .env file!')
  process.exit(1)
}

const notification_type = 'card-incoming'
const operation_id = 'test-op-' + Math.floor(Math.random() * 1000000)
const amount = parseFloat(amountArg).toFixed(2)
const currency = '643'
const datetime = new Date().toISOString()
const sender = ''
const codepro = 'false'
const label = purchaseId

// Verify signature formula: notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label
const signatureSource = `${notification_type}&${operation_id}&${amount}&${currency}&${datetime}&${sender}&${codepro}&${secret}&${label}`
const sha1_hash = crypto.createHash('sha1').update(signatureSource).digest('hex')

console.log('--- Generating YooMoney Webhook Mock ---')
console.log('Target Purchase ID (label):', label)
console.log('Amount:', amount)
console.log('Signature Source Str:', signatureSource)
console.log('Generated hash (sign):', sha1_hash)

const payload = new URLSearchParams({
  notification_type,
  operation_id,
  amount,
  currency,
  datetime,
  sender,
  codepro,
  label,
  sign: sha1_hash // YooMoney card payment sends 'sign' parameter
})

console.log('\nSending POST request to /api/yoomoney/callback...')

const http = require('http')
const postData = payload.toString()

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/yoomoney/callback',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
}

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`)
  res.setEncoding('utf8')
  let body = ''
  res.on('data', (chunk) => {
    body += chunk
  })
  res.on('end', () => {
    console.log('RESPONSE BODY:', body)
    console.log('\nDone. Check the server logs and DB to verify status change.')
  })
})

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`)
  console.error('Make sure your next.js server is running on http://localhost:3000')
})

req.write(postData)
req.end()
