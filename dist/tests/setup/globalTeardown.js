"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = globalTeardown;
const client_1 = require("@prisma/client");
async function globalTeardown() {
    const prisma = new client_1.PrismaClient();
    try {
        await prisma.$disconnect();
    }
    catch {
    }
}
//# sourceMappingURL=globalTeardown.js.map