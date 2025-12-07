import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    color: "#666",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    fontWeight: "bold",
    borderBottom: "2pt solid #e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1pt solid #e5e7eb",
  },
  tableCol1: {
    width: "40%",
  },
  tableCol2: {
    width: "15%",
    textAlign: "center",
  },
  tableCol3: {
    width: "15%",
    textAlign: "center",
  },
  tableCol4: {
    width: "15%",
    textAlign: "right",
  },
  tableCol5: {
    width: "15%",
    textAlign: "right",
  },
  summary: {
    marginTop: 20,
    marginLeft: "auto",
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTop: "2pt solid #000",
    fontWeight: "bold",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 10,
  },
});

interface OrderItem {
  name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: string | number;
  total: string | number;
}

interface Order {
  orderNumber: string;
  createdAt: Date | string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: OrderItem[];
  subtotal: string | number;
  discount?: string | number | null;
  shippingCost?: string | number | null;
  tax?: string | number | null;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
}

interface StoreInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

interface InvoiceDocumentProps {
  order: Order;
  storeInfo: StoreInfo;
}

const formatPrice = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₹${num.toFixed(2)}`;
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  order,
  storeInfo,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>{storeInfo.name}</Text>
        {storeInfo.email && (
          <Text style={styles.companyInfo}>Email: {storeInfo.email}</Text>
        )}
        {storeInfo.phone && (
          <Text style={styles.companyInfo}>Phone: {storeInfo.phone}</Text>
        )}
        {storeInfo.address && (
          <Text style={styles.companyInfo}>{storeInfo.address}</Text>
        )}
        {storeInfo.taxId && (
          <Text style={styles.companyInfo}>GSTIN: {storeInfo.taxId}</Text>
        )}
      </View>

      <Text style={styles.invoiceTitle}>TAX INVOICE</Text>

      {/* Invoice Details */}
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{order.orderNumber}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Invoice Date</Text>
            <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Payment Status</Text>
            <Text style={styles.value}>
              {order.paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Bill To */}
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{order.shippingAddress.fullName}</Text>
            <Text style={styles.companyInfo}>{order.customerEmail}</Text>
            <Text style={styles.companyInfo}>
              {order.shippingAddress.phone}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Ship To</Text>
            <Text style={styles.value}>{order.shippingAddress.fullName}</Text>
            <Text style={styles.companyInfo}>
              {order.shippingAddress.address}
            </Text>
            <Text style={styles.companyInfo}>
              {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
              {order.shippingAddress.pincode}
            </Text>
          </View>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableCol1}>Item</Text>
          <Text style={styles.tableCol2}>Size/Color</Text>
          <Text style={styles.tableCol3}>Qty</Text>
          <Text style={styles.tableCol4}>Price</Text>
          <Text style={styles.tableCol5}>Amount</Text>
        </View>

        {/* Table Rows */}
        {order.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCol1}>{item.name}</Text>
            <Text style={styles.tableCol2}>
              {item.size && item.color
                ? `${item.size} / ${item.color}`
                : item.size || item.color || "-"}
            </Text>
            <Text style={styles.tableCol3}>{item.quantity}</Text>
            <Text style={styles.tableCol4}>{formatPrice(item.price)}</Text>
            <Text style={styles.tableCol5}>{formatPrice(item.total)}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text>Subtotal:</Text>
          <Text>{formatPrice(order.subtotal)}</Text>
        </View>

        {order.discount && parseFloat(order.discount.toString()) > 0 && (
          <View style={styles.summaryRow}>
            <Text>Discount:</Text>
            <Text>-{formatPrice(order.discount)}</Text>
          </View>
        )}

        {order.shippingCost && parseFloat(order.shippingCost.toString()) > 0 && (
          <View style={styles.summaryRow}>
            <Text>Shipping:</Text>
            <Text>{formatPrice(order.shippingCost)}</Text>
          </View>
        )}

        {order.tax && parseFloat(order.tax.toString()) > 0 && (
          <View style={styles.summaryRow}>
            <Text>Tax (GST):</Text>
            <Text>{formatPrice(order.tax)}</Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text>TOTAL:</Text>
          <Text>{formatPrice(order.total)}</Text>
        </View>
      </View>

      {/* Payment Info */}
      <View style={{ marginTop: 30 }}>
        <Text style={styles.label}>Payment Method</Text>
        <Text style={styles.value}>{order.paymentMethod}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Thank you for your business!</Text>
        <Text>
          This is a computer-generated invoice and does not require a signature.
        </Text>
      </View>
    </Page>
  </Document>
);
