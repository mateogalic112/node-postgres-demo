export enum BidEvent {
  CREATE_BID = "CREATE_BID",
  BID_CREATED = "BID_CREATED"
}

export function constructBidEvent(namespace: string, bidEvent: BidEvent) {
  return `${namespace}:${bidEvent.toLowerCase()}`;
}
