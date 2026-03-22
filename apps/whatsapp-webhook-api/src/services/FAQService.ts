import { prisma } from "../lib/prisma.js";

export class FAQService {
  async listByTenant(tenantId: string) {
    return prisma.fAQ.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findMatch(tenantId: string, message: string): Promise<{ answer: string } | null> {
    const faqs = await prisma.fAQ.findMany({
      where: { tenantId },
    });
    const lower = message.trim().toLowerCase();
    for (const faq of faqs) {
      const keywords = (faq.keywords ?? faq.question)
        .toLowerCase()
        .split(/[\s,;]+/)
        .filter(Boolean);
      const questionWords = faq.question.toLowerCase().split(/\s+/);
      const allTerms = [...new Set([...keywords, ...questionWords])];
      const matchCount = allTerms.filter((t) => t.length > 2 && lower.includes(t)).length;
      if (matchCount >= Math.min(2, allTerms.length)) {
        return { answer: faq.answer };
      }
    }
    return null;
  }
}

export const faqService = new FAQService();
