import { OrderData } from "../order/order.types";

export interface CreateOrderJobData {
    tenantId: string,
    logId: string,
    eventId: string,
    orderId: string,
    domain: string,
    payload: OrderData,
}