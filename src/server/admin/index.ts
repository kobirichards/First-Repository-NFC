import "server-only";
import { listAuditEvents } from "./audit";
import { batchQrZip, createBatch, listBatches, regenerateClaimCodes } from "./batches";
import { getCardForAdmin, reassignCard, releaseCard, searchCards, setCardActive } from "./cards";
import { createProduct, getProductForAdmin, listProductsForAdmin, setPrice, updateProduct, upsertOption } from "./catalog";
import { assignCardsToOrderItem, getOrderForAdmin, listOrders, orderCounts, recordRefund, updateOrderStatus } from "./orders";
import { countEnquiries, getCustomer, listCustomers, listEnquiries, setEnquiryStatus } from "./people";
import { countProofs, getArtworkFile, listProofs, reviewProof } from "./proofs";

/**
 * Every admin operation, in one place. Each one starts with assertAdmin(actor).
 * tests/integration/admin-authz.test.ts calls every entry with non-admin
 * actors and fails if any is missing a check. Add new operations here.
 */
export const adminOperations = {
  listAuditEvents,
  createBatch,
  regenerateClaimCodes,
  listBatches,
  batchQrZip,
  searchCards,
  getCardForAdmin,
  setCardActive,
  reassignCard,
  releaseCard,
  listProductsForAdmin,
  getProductForAdmin,
  createProduct,
  updateProduct,
  upsertOption,
  setPrice,
  listOrders,
  getOrderForAdmin,
  updateOrderStatus,
  recordRefund,
  assignCardsToOrderItem,
  orderCounts,
  listCustomers,
  getCustomer,
  listEnquiries,
  countEnquiries,
  setEnquiryStatus,
  listProofs,
  countProofs,
  reviewProof,
  getArtworkFile,
} as const;

export * from "./audit";
export * from "./batches";
export * from "./cards";
export * from "./catalog";
export * from "./guard";
export * from "./orders";
export * from "./people";
export * from "./proofs";
