import type { ServiceResponse } from "../builtin-industry";

// --- Domain types ---

interface Shipment {
  id: string;
  trackingNo: string;
  sender: string;
  receiver: string;
  origin: string;
  destination: string;
  weight: number;
  status: string;
  estimatedDelivery: string;
}

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedTime: string;
  vehicleId: string;
  stops: string[];
}

interface LogisticsVehicle {
  id: string;
  plate: string;
  type: string;
  capacity: number;
  driver: string;
  status: string;
  currentLocation: string;
}

interface DeliveryConfirmation {
  id: string;
  shipmentId: string;
  receiverName: string;
  signedAt: string | null;
  photoUrl: string | null;
  notes: string;
}

// --- Mock data ---

const shipments: Shipment[] = [
  {
    id: "shp-1",
    trackingNo: "TW2026032800001",
    sender: "鮮味食品有限公司",
    receiver: "全聯福利中心板橋店",
    origin: "桃園市蘆竹區",
    destination: "新北市板橋區",
    weight: 250,
    status: "in_transit",
    estimatedDelivery: "2026-03-28T14:00:00",
  },
  {
    id: "shp-2",
    trackingNo: "TW2026032800002",
    sender: "台灣精密科技股份有限公司",
    receiver: "新竹科學園區管理局",
    origin: "台中市西屯區",
    destination: "新竹市東區",
    weight: 45,
    status: "pending",
    estimatedDelivery: "2026-03-29T10:00:00",
  },
  {
    id: "shp-3",
    trackingNo: "TW2026032700015",
    sender: "博客來網路書店",
    receiver: "張雅琪",
    origin: "台北市中山區",
    destination: "高雄市前鎮區",
    weight: 3.5,
    status: "delivered",
    estimatedDelivery: "2026-03-27T17:00:00",
  },
];

const routes: Route[] = [
  {
    id: "rt-1",
    name: "北部都會配送線",
    origin: "桃園市蘆竹區物流中心",
    destination: "新北市板橋區",
    distance: 45,
    estimatedTime: "1.5小時",
    vehicleId: "lv-1",
    stops: ["桃園龜山轉運站", "新莊集貨站", "板橋配送點"],
  },
  {
    id: "rt-2",
    name: "中北長途線",
    origin: "台中市西屯區",
    destination: "新竹市東區",
    distance: 95,
    estimatedTime: "2小時",
    vehicleId: "lv-2",
    stops: ["苗栗轉運站", "新竹交流道"],
  },
  {
    id: "rt-3",
    name: "南部快遞線",
    origin: "台北市中山區",
    destination: "高雄市前鎮區",
    distance: 350,
    estimatedTime: "5小時",
    vehicleId: "lv-3",
    stops: ["台中轉運中心", "嘉義集貨站", "高雄前鎮配送中心"],
  },
];

const vehicles: LogisticsVehicle[] = [
  {
    id: "lv-1",
    plate: "KAA-0012",
    type: "大型貨車",
    capacity: 5000,
    driver: "吳建宏",
    status: "on_route",
    currentLocation: "新莊集貨站",
  },
  {
    id: "lv-2",
    plate: "KBB-3456",
    type: "小型貨車",
    capacity: 1500,
    driver: "劉俊傑",
    status: "available",
    currentLocation: "台中西屯物流中心",
  },
  {
    id: "lv-3",
    plate: "KCC-7890",
    type: "大型貨車",
    capacity: 8000,
    driver: "許志豪",
    status: "on_route",
    currentLocation: "嘉義集貨站",
  },
];

const deliveryConfirmations: DeliveryConfirmation[] = [
  {
    id: "dc-1",
    shipmentId: "shp-3",
    receiverName: "張雅琪",
    signedAt: "2026-03-27T16:45:00",
    photoUrl: "/deliveries/dc-1-photo.jpg",
    notes: "已交付本人簽收",
  },
  {
    id: "dc-2",
    shipmentId: "shp-1",
    receiverName: "全聯板橋店倉管李先生",
    signedAt: null,
    photoUrl: null,
    notes: "配送中，預計下午兩點前送達",
  },
];

// --- Action handlers ---

function listShipments(filters?: Record<string, unknown>) {
  let items = [...shipments];
  if (filters?.status) items = items.filter((s) => s.status === filters.status);
  if (filters?.sender) items = items.filter((s) => s.sender === filters.sender);
  if (filters?.receiver)
    items = items.filter((s) => s.receiver === filters.receiver);
  return { items, total: items.length };
}

function getShipment(id: unknown) {
  return shipments.find((s) => s.id === id) ?? null;
}

function trackShipment(trackingNo: unknown) {
  const shipment = shipments.find((s) => s.trackingNo === trackingNo);
  if (!shipment) return null;

  const route = routes.find((r) =>
    shipment.status === "in_transit"
      ? r.origin.includes(shipment.origin.split("市")[0]) ||
        r.destination.includes(shipment.destination.split("市")[0])
      : false
  );
  const vehicle = route
    ? vehicles.find((v) => v.id === route.vehicleId)
    : null;
  const confirmation = deliveryConfirmations.find(
    (dc) => dc.shipmentId === shipment.id
  );

  return {
    shipment,
    currentLocation: vehicle?.currentLocation ?? shipment.destination,
    route: route
      ? { name: route.name, stops: route.stops }
      : null,
    confirmation: confirmation ?? null,
  };
}

function listRoutes(filters?: Record<string, unknown>) {
  let items = [...routes];
  if (filters?.vehicleId)
    items = items.filter((r) => r.vehicleId === filters.vehicleId);
  return { items, total: items.length };
}

function listVehicles(filters?: Record<string, unknown>) {
  let items = [...vehicles];
  if (filters?.status) items = items.filter((v) => v.status === filters.status);
  if (filters?.type) items = items.filter((v) => v.type === filters.type);
  return { items, total: items.length };
}

function listDeliveryConfirmations(filters?: Record<string, unknown>) {
  let items = [...deliveryConfirmations];
  if (filters?.shipmentId)
    items = items.filter((dc) => dc.shipmentId === filters.shipmentId);
  return { items, total: items.length };
}

// --- Main handler ---

const ACTIONS =
  "listShipments, getShipment, trackShipment, listRoutes, listVehicles, listDeliveryConfirmations";

/**
 * Logistics Service API
 *
 * Actions:
 * - listShipments(filters?: { status?, sender?, receiver? }) — list all shipments, optionally filtered
 * - getShipment(id) — get a single shipment by ID
 * - trackShipment(trackingNo) — track a shipment by tracking number, returns shipment details with current location, route, and delivery confirmation
 * - listRoutes(filters?: { vehicleId? }) — list delivery routes, optionally filtered
 * - listVehicles(filters?: { status?, type? }) — list logistics vehicles, optionally filtered
 * - listDeliveryConfirmations(filters?: { shipmentId? }) — list delivery confirmations, optionally filtered
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string | undefined;

  if (!action) {
    return {
      status: 400,
      body: { error: `Missing 'action' field. Available: ${ACTIONS}` },
    };
  }

  switch (action) {
    case "listShipments":
      return {
        status: 200,
        body: listShipments(body.filters as Record<string, unknown>),
      };

    case "getShipment": {
      const item = getShipment(body.id);
      if (!item)
        return { status: 404, body: { error: `Shipment not found: ${body.id}` } };
      return { status: 200, body: item };
    }

    case "trackShipment": {
      const result = trackShipment(body.trackingNo);
      if (!result)
        return {
          status: 404,
          body: { error: `Shipment not found for tracking number: ${body.trackingNo}` },
        };
      return { status: 200, body: result };
    }

    case "listRoutes":
      return {
        status: 200,
        body: listRoutes(body.filters as Record<string, unknown>),
      };

    case "listVehicles":
      return {
        status: 200,
        body: listVehicles(body.filters as Record<string, unknown>),
      };

    case "listDeliveryConfirmations":
      return {
        status: 200,
        body: listDeliveryConfirmations(body.filters as Record<string, unknown>),
      };

    default:
      return {
        status: 400,
        body: { error: `Unknown action: ${action}. Available: ${ACTIONS}` },
      };
  }
}
