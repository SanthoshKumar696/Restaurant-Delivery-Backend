import { Router } from "express";

import healthRoutes from "./health.routes";
import tenantRoutes from "../modules/tenants/tenant.routes";
import branchRoutes from "../modules/branches/branch.routes";
import staffRoutes from "../modules/staff/staff.routes";
import categoryRoutes from "../modules/menu/category/category.routes";
import productRoutes from "../modules/menu/product/product.routes";
import productVariantRoutes from "../modules/menu/product-variant/product-variant.routes";
import customerRoutes from "../modules/customers/customer/customer.routes";
import orderRoutes from "../modules/orders/order/order.routes";
import reportRoutes from "../modules/reports/report.routes";
import addressRoutes from "../modules/customers/address/address.routes";
import addonGroupRoutes from "../modules/menu/addon-group/addon-group.routes";
import addonGroupItemRoutes from "../modules/menu/addon-group-items/addon-group-items.routes";
import productAddonGroupRoutes from "../modules/menu/product-addon-group/product-addon-group.routes";
import bannerRoutes from "../modules/banners/banner.routes";
import adminOrderRoutes from "../modules/admin-orders/order/order.routes";
import adminAuthRoutes from "../modules/auth/admin/admin.routes";
import customerAuthRoutes from "../modules/auth/customer/customer.routes";

const router = Router();

router.use(healthRoutes);
router.use("/auth", adminAuthRoutes);
router.use("/auth", customerAuthRoutes);
router.use("/tenants", tenantRoutes);
router.use("/branches", branchRoutes);
router.use("/customers", customerRoutes);
router.use("/customers", addressRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/product-variants", productVariantRoutes);
router.use("/addon-groups", addonGroupRoutes);
router.use("/addon-group-items", addonGroupItemRoutes);
router.use("/product-addon-groups", productAddonGroupRoutes);
router.use("/banners", bannerRoutes);
router.use("/orders", orderRoutes);
router.use("/staff", staffRoutes);
router.use("/reports", reportRoutes);
router.use("/admin/orders", adminOrderRoutes);

export default router;