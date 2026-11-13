export function createTicket(number, title, status, note = "", priority = "Normal", dates = {}) {
  const createdAt = dates.createdAt || new Date().toISOString();
  const statusUpdatedAt = dates.statusUpdatedAt || createdAt;

  return {
    id: crypto.randomUUID(),
    number,
    title,
    company: dates.company || "",
    companyCode: dates.companyCode || "",
    status,
    note,
    priority,
    createdAt,
    statusUpdatedAt,
    archivedAt: dates.archivedAt || "",
    updatedAt: dates.updatedAt || new Date().toISOString(),
  };
}

export function normalizeTicketDates(item, companyCodes) {
  const createdAt = item.createdAt || item.updatedAt || new Date().toISOString();
  const companyDetails = normalizeCompanyDetails(
    item.companyCode,
    item.company,
    !Object.hasOwn(item, "companyCode"),
    companyCodes,
  );
  return {
    ...item,
    companyCode: companyDetails.code,
    company: companyDetails.name,
    createdAt,
    statusUpdatedAt: item.statusUpdatedAt || item.updatedAt || createdAt,
    archivedAt: item.archivedAt || "",
  };
}

export function normalizeCompanyDetails(companyCode, company, useKnownCode = false, companyCodes = new Map()) {
  const code = String(companyCode || "").trim();
  const name = String(company || "").trim();
  const legacyMatch = name.match(/^(\d+)\s*-\s*(.+)$/);
  const codeOnly = name.match(/^\d+$/);
  const cleanName = legacyMatch || codeOnly ? (legacyMatch?.[2] || "").trim() : name;
  const knownCode = useKnownCode ? companyCodes.get(cleanName.toUpperCase()) : "";

  return {
    code: code || (legacyMatch ? legacyMatch[1] : codeOnly?.[0] || knownCode || ""),
    name: cleanName,
  };
}

export function needsCompanyCodeMigration(original, normalized) {
  return (original.companyCode || "") !== normalized.companyCode
    || (original.company || "") !== normalized.company;
}
