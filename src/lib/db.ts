import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

if (process.env.NEXT_RUNTIME !== "edge") {
  db.$use(async (params, next) => {

    const softDeleteModels = [
      "User",
      "Resume",
      "ResumeAnalysis",
      "JobDescription",
    ];
    if (softDeleteModels.includes(params.model || "")) {

      if (params.action === "findUnique" || params.action === "findFirst") {
        params.action = "findFirst";
        params.args.where = {
          ...params.args.where,
          deletedAt: null,
        };
      }

      if (params.action === "findMany") {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      if (params.action === "count") {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      if (params.action === "update") {
        params.action = "updateMany";
        params.args.where = {
          ...params.args.where,
          deletedAt: null,
        };
      }

      if (params.action === "updateMany") {
        if (params.args.where) {
          params.args.where.deletedAt = null;
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      if (params.action === "delete") {
        params.action = "update";
        params.args.data = { deletedAt: new Date() };
      }

      if (params.action === "deleteMany") {
        params.action = "updateMany";
        if (params.args.data !== undefined) {
          params.args.data.deletedAt = new Date();
        } else {
          params.args.data = { deletedAt: new Date() };
        }
      }
    }
    return next(params);
  });
}
