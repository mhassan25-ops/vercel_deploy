import axios from "axios";

// ---  API Setup ---
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Label Schema (matches backend exactly) ---
export interface Label {
  vendor_id: string;
  quality: string;
  sizes: string;  // Backend expects string, not array
  printed_woven: string;  // 'Printed' or 'Woven'
  elastic_type: string;  // 'in-house' or 'outsourced'
  elastic_vendor_id?: string | null;
  additional_info: string;
  trims: string[];  // Backend expects array
}

// --- Order Schema (matches backend exactly) ---
export interface Order {
  customer_name: string;
  order_number: string;
  bags: number;
  company_order_number: string;
  yarn_count: number;
  content: string;
  spun: string;
  sizes: string[];  // Order-level sizes as array
  knitting_type: string;
  dyeing_type: string;
  dyeing_color: string; 
  finishing_type: string;
  po_number: string;
  additional_info: string;
  labels?: Label[] | null;
}

// --- API Function ---
export const receiveOrder = async (data: Order) => {
  try {
    const response = await api.post("/receive_order/", data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error receiving order:", error.response?.data || error.message);
    throw error;
  }
};