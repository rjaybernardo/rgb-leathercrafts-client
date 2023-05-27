import { mongooseConnect } from '@/lib/mongoose'
const stripe = require('stripe')(process.env.STRIPE_SK)
import { buffer } from 'micro'
import { Order } from '@/models/Order'

const endpointSecret = (endpoint_secret =
  'whsec_f11619a3afe14a2affa929a719a94c4d98d9d65697ed1ed09d257b8572cae004')

export default async function handler(req, res) {
  await mongooseConnect()
  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(
      await buffer(req),
      sig,
      endpointSecret
    )
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const data = event.data.object
      const orderId = data.metadata.orderId
      const paid = data.payment_status === 'paid'
      if (orderId && paid) {
        await Order.findByIdAndUpdate(orderId, {
          paid: true,
        })
      }
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.status(200).send('ok')
}

export const config = {
  api: { bodyParser: false },
}

// bright-thrift-cajole-lean
// acct_1Lj5ADIUXXMmgk2a
