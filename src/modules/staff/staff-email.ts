import { HttpError } from "../../common/errors/http-error";
import { prisma } from "../../database/prisma";

export const normalizeStaffEmail = (email: string | null | undefined) =>
  email?.trim().toLowerCase() || null;

export const ensureUniqueStaffEmail = async (
  email: string | null | undefined,
  excludeId?: number
) => {
  const normalizedEmail = normalizeStaffEmail(email);
  if (!normalizedEmail) return;

  const existingStaff = await prisma.staffUser.findFirst({
    where: {
      email: normalizedEmail,
      ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  if (existingStaff) {
    throw new HttpError("Staff user with this email already exists", 409, "STAFF_EMAIL_CONFLICT");
  }
};
