export enum OrderStatus {
  draft = 'draft',
  received = 'received',
  processed = 'processed',
  confirmed = 'confirmed',
  fake = 'fake order',
  duplicate = 'duplicate',
  paymentPending = 'payment pending',
  noPick = 'no pick',
  cancel = 'cancel',
  inBookingQueue = 'in booking queue',
}

export enum OrderEvents {
  received = 'order received from shopify store {store}',
  created = 'order created',
  updated = 'order updated',
  statusUpdatedFromTo = 'order status updated, {from} -> {to}',
  statusUpdatedTo = 'order status updated to {status}',
  paymentAdded = 'payment added',
  itemAdded = 'new item added',
  itemUpdated = 'item updated',
  itemDeleted = 'item deleted',
  deleted = 'order deleted',
}
