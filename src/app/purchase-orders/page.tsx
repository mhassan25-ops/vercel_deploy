"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { receiveOrder, Order as OrderType } from "../../../backend/api/order";
import { downloadPurchaseOrder } from "../../../backend/api/purchase-orders";

// Frontend label - trims as string for user input, sizes as string (matches backend)
interface Label {
  vendor_id: string;
  quality: string;
  sizes: string;  // Single string in backend
  printed_woven: string;
  elastic_type: string;
  elastic_vendor_id?: string | null;
  additional_info: string;
  trims?: string;  // Frontend: comma-separated string
}

export default function PurchaseOrdersPage() {
  const [orderData, setOrderData] = useState({
    customer_name: "",
    order_number: "",
    bags: 0,
    company_order_number: "",
    yarn_count: 0,
    content: "",
    spun: "",
    sizes: [] as string[],
    knitting_type: "",
    dyeing_type: "",
    dyeing_color: "",
    finishing_type: "",
    po_number: "",
    additional_info: "",
  });

  const [receiveLoading, setReceiveLoading] = useState(false);
  const [message1, setMessage1] = useState<string | null>(null);

  const [labels, setLabels] = useState<Label[]>([
    { 
      vendor_id: "", 
      quality: "", 
      sizes: "",  // String field
      printed_woven: "", 
      elastic_type: "", 
      elastic_vendor_id: "", 
      additional_info: "",
      trims: "", 
    },
  ]);

  // Download PO states
  const [poNumber, setPoNumber] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [message2, setMessage2] = useState<string | null>(null);

  const addLabel = () => {
    setLabels((prev) => [
      ...prev,
      { 
        vendor_id: "", 
        quality: "", 
        sizes: "",
        printed_woven: "", 
        elastic_type: "", 
        elastic_vendor_id: "", 
        additional_info: "",
        trims: "", 
      },
    ]);
  };

  const removeLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, field: keyof Label, value: string) => {
    setLabels((prev) => {
      const newLabels = [...prev];
      newLabels[index] = {
        ...newLabels[index],
        [field]: value,
      };
      return newLabels;
    });
  };

  const validateOrder = (): string | null => {
    const mandatoryFields = [
      "customer_name",
      "order_number",
      "bags",
      "company_order_number",
      "yarn_count",
      "content",
      "spun",
      "sizes",
      "knitting_type",
      "dyeing_type",
      "finishing_type",
      "po_number",
      "additional_info",
    ];

    for (const field of mandatoryFields) {
      const value = orderData[field as keyof typeof orderData];
      if (value === "" || value === 0 || (Array.isArray(value) && value.length === 0)) {
        return `Please fill the mandatory order field: ${field.replaceAll("_", " ")}`;
      }
    }

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const mandatoryLabelFields: (keyof Label)[] = [
        "vendor_id", 
        "quality", 
        "sizes",
        "printed_woven", 
        "elastic_type",
        "additional_info"
      ];
      for (const field of mandatoryLabelFields) {
        const value = label[field];
        if (!value || value.toString().trim() === "") {
          return `Please fill mandatory label field "${field}" for label #${i + 1}`;
        }
      }
    }

    return null;
  };

  const handleReceiveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage1(null);

    const error = validateOrder();
    if (error) {
      setMessage1(`❌ ${error}`);
      return;
    }

    setReceiveLoading(true);
    try {
      // Convert frontend format to backend format
      const payload: OrderType = {
        ...orderData,
        bags: Number(orderData.bags),
        yarn_count: Number(orderData.yarn_count),
        sizes: orderData.sizes.map((s) => s.trim()).filter((s) => s !== ""),
        labels: labels.map((label) => ({
          vendor_id: label.vendor_id,
          quality: label.quality,
          sizes: label.sizes,  // Keep as string
          printed_woven: label.printed_woven,
          elastic_type: label.elastic_type,
          elastic_vendor_id: label.elastic_vendor_id || null,
          additional_info: label.additional_info,
          trims: label.trims 
            ? label.trims.split(",").map((s) => s.trim()).filter((s) => s !== "") 
            : [],  // Convert string to array
        })),
      };

      await receiveOrder(payload);
      setMessage1("✅ Order received successfully!");
      
      // Reset form
      setOrderData({
        customer_name: "",
        order_number: "",
        bags: 0,
        company_order_number: "",
        yarn_count: 0,
        content: "",
        spun: "",
        sizes: [],
        knitting_type: "",
        dyeing_type: "",
        dyeing_color: "",
        finishing_type: "",
        po_number: "",
        additional_info: "",
      });
      setLabels([{ 
        vendor_id: "", 
        quality: "", 
        sizes: "",
        printed_woven: "", 
        elastic_type: "", 
        elastic_vendor_id: "", 
        additional_info: "",
        trims: "", 
      }]);
    } catch (err) {
      console.error(err);
      setMessage1("❌ Failed to receive order. Check console for details.");
    } finally {
      setReceiveLoading(false);
    }
  };

const handleDownloadPO = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!poNumber.trim()) {
    setMessage2("❌ Please enter PO number to download.");
    return;
  }

  setDownloadLoading(true);
  setMessage2(null);

  try {
    // Call the API to get the PDF blob
    const blob = await downloadPurchaseOrder(poNumber.trim());

    // Create a URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);

    // Create an anchor element to trigger the download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `PO_${poNumber}.pdf`; // Match your backend filename
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    setMessage2(`📄 Purchase Order #${poNumber} downloaded successfully!`);
    setPoNumber(""); // Clear the input after successful download
  } catch (err: any) {
    console.error("Download error:", err);
    
    // Better error handling based on axios error response
    if (err.response?.status === 404) {
      setMessage2(`❌ Purchase Order #${poNumber} not found.`);
    } else if (err.response?.status === 500) {
      setMessage2("❌ Server error while generating PDF. Please try again.");
    } else {
      setMessage2("❌ Error downloading purchase order. Please check your connection.");
    }
  } finally {
    setDownloadLoading(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen flex flex-col items-center bg-gradient-to-br from-white via-sky-50 to-indigo-100 py-16 px-6"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-3">Purchase Orders</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Manage and receive new orders with multiple labels or download existing purchase orders.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-10 mb-12 hover:shadow-indigo-200 transition-shadow duration-300"
      >
        <h2 className="text-2xl font-bold text-indigo-700 mb-8 text-center">Receive New Order</h2>

        <form onSubmit={handleReceiveOrder} className="space-y-4">
          {/* Order fields */}
          {Object.entries(orderData)
            .filter(([key]) => key !== "sizes")
            .map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {key.replaceAll("_", " ")} <span className="text-red-500">*</span>
                </label>
                <input
                  type={key === "bags" || key === "yarn_count" ? "number" : "text"}
                  value={value as string | number}
                  onChange={(e) =>
                    setOrderData((prev) => ({
                      ...prev,
                      [key]:
                        key === "bags" || key === "yarn_count"
                          ? Number(e.target.value)
                          : e.target.value,
                    }))
                  }
                  placeholder={`Enter ${key.replaceAll("_", " ")}`}
                  className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  required
                />
              </div>
            ))}

          {/* Sizes section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sizes <span className="text-red-500">*</span>
            </label>
            {orderData.sizes.map((size, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={size}
                  onChange={(e) => {
                    const newSizes = [...orderData.sizes];
                    newSizes[index] = e.target.value;
                    setOrderData((prev) => ({ ...prev, sizes: newSizes }));
                  }}
                  placeholder="Enter size (e.g. S, M, L or 32x34)"
                  className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {orderData.sizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newSizes = [...orderData.sizes];
                      newSizes.splice(index, 1);
                      setOrderData((prev) => ({ ...prev, sizes: newSizes }));
                    }}
                    className="ml-2 text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setOrderData((prev) => ({ ...prev, sizes: [...prev.sizes, ""] }))}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              + Add Size
            </button>
          </div>

          {/* Labels */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-indigo-600">Labels</h3>
            {labels.map((label, idx) => (
              <div key={idx} className="border p-4 rounded-xl mb-4 bg-white/70 shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vendor ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={label.vendor_id}
                      onChange={(e) => updateLabel(idx, "vendor_id", e.target.value)}
                      placeholder="Enter vendor ID"
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={label.quality}
                      onChange={(e) => updateLabel(idx, "quality", e.target.value)}
                      placeholder="Enter quality"
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                  </div>

                  {/* Sizes (string field for label) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sizes <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={label.sizes}
                      onChange={(e) => updateLabel(idx, "sizes", e.target.value)}
                      placeholder="Enter sizes (e.g., S/M/L)"
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                  </div>

                  {/* Printed/Woven */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Printed/Woven <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={label.printed_woven}
                      onChange={(e) => updateLabel(idx, "printed_woven", e.target.value)}
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    >
                      <option value="">Select...</option>
                      <option value="Printed">Printed</option>
                      <option value="Woven">Woven</option>
                    </select>
                  </div>

                  {/* Elastic Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Elastic Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={label.elastic_type}
                      onChange={(e) => updateLabel(idx, "elastic_type", e.target.value)}
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    >
                      <option value="">Select...</option>
                      <option value="in-house">In-House</option>
                      <option value="outsourced">Outsourced</option>
                    </select>
                  </div>

                  {/* Elastic Vendor ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Elastic Vendor ID
                    </label>
                    <input
                      type="text"
                      value={label.elastic_vendor_id || ""}
                      onChange={(e) => updateLabel(idx, "elastic_vendor_id", e.target.value)}
                      placeholder="Enter elastic vendor ID (optional)"
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                  </div>

                  {/* Additional Info */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Info <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={label.additional_info}
                      onChange={(e) => updateLabel(idx, "additional_info", e.target.value)}
                      placeholder="Enter additional information"
                      rows={2}
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                  </div>

                  {/* Trims */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trims (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={label.trims || ""}
                      onChange={(e) => updateLabel(idx, "trims", e.target.value)}
                      placeholder="e.g., Poly Bag, Carton, Belly Band"
                      className="w-full rounded-xl border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    />
                  </div>
                </div>
                
                {labels.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeLabel(idx)} 
                    className="mt-3 text-sm text-red-500 hover:underline"
                  >
                    Remove Label
                  </button>
                )}
              </div>
            ))}
            
            {labels.length < 4 && (
              <button 
                type="button" 
                onClick={addLabel} 
                className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 shadow-md transition"
              >
                + Add Label (max 4)
              </button>
            )}
          </div>

          <motion.button 
            whileTap={{ scale: 0.97 }} 
            disabled={receiveLoading} 
            type="submit" 
            className="w-full mt-6 px-8 py-3 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 shadow-md transition disabled:opacity-60"
          >
            {receiveLoading ? "Receiving..." : "Receive Order"}
          </motion.button>
        </form>

        {message1 && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className={`mt-6 text-center font-medium ${message1.includes("✅") ? "text-green-600" : "text-red-600"}`}
          >
            {message1}
          </motion.p>
        )}
      </motion.div>

      {/* Download PO Card */}
      <motion.div 
        initial={{ opacity: 0, x: 30 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.5 }} 
        className="w-full max-w-6xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-10 hover:shadow-sky-200 transition-shadow duration-300"
      >
        <h2 className="text-2xl font-bold text-sky-600 mb-8 text-center">Download Purchase Order</h2>

        <form onSubmit={handleDownloadPO} className="flex flex-col md:flex-row md:items-end md:space-x-6 space-y-4 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
            <input 
              type="text" 
              value={poNumber} 
              onChange={(e) => setPoNumber(e.target.value)} 
              placeholder="Enter PO number" 
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm" 
            />
          </div>

          <motion.button 
            whileTap={{ scale: 0.97 }} 
            disabled={downloadLoading} 
            type="submit" 
            className="w-full md:w-auto px-8 py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 shadow-md transition disabled:opacity-60"
          >
            {downloadLoading ? "Downloading..." : "Download PO"}
          </motion.button>
        </form>

        {message2 && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className={`mt-6 text-center font-medium ${message2.includes("📄") ? "text-green-600" : "text-red-600"}`}
          >
            {message2}
          </motion.p>
        )}
      </motion.div>

      {/* Footer */}
      <p className="mt-14 text-gray-500 text-sm text-center">
        © {new Date().getFullYear()} Yarn Management System
      </p>
    </motion.div>
  );
}