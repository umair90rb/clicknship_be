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
}

export enum OrderEvents {
  created = 'order created',
  updated = 'order updated',
  statusUpdated = 'order status updated, {from} -> {to}',
  paymentAdded = 'payment added',
  itemAdded = 'new item added',
  itemUpdated = 'item updated',
  itemDeleted = 'item deleted',
  deleted = 'order deleted',
}
