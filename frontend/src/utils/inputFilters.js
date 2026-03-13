/**
 * Фильтры ввода: ограничения по типам полей (дата, номер, имя, VIN и т.п.).
 */

/** Имя/ФИО: только буквы (латиница, кириллица), пробелы, дефис, апостроф. Цифры запрещены. */
export function nameOnly(value) {
  if (value == null || value === "") return "";
  return String(value).replace(/[^A-Za-zА-Яа-яЁё\s\-']/g, "");
}

/** VIN: только буквы и цифры, максимум 17 символов. */
export function vinOnly(value, maxLength = 17) {
  if (value == null || value === "") return "";
  return String(value)
    .replace(/[^A-Za-zА-Яа-яЁё0-9]/g, "")
    .slice(0, maxLength);
}

/** Только цифры (для длительности, цены, количества, года и т.п.) */
export function digitsOnly(value) {
  if (value == null || value === "") return "";
  return String(value).replace(/\D/g, "");
}

/** Только цифры, максимум maxLength символов (например, 4 для года) */
export function digitsOnlyMax(value, maxLength = 20) {
  return digitsOnly(value).slice(0, maxLength);
}

/** Телефон: только цифры, формат +7 (XXX) XXX-XX-XX */
export function formatPhone(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  let res = "+7 ";
  const body = digits.startsWith("7") ? digits.slice(1) : digits;
  if (body.length > 0) {
    res += "(" + body.slice(0, 3);
    if (body.length >= 3) res += ") ";
  }
  if (body.length >= 4) {
    res += body.slice(3, 6);
  }
  if (body.length >= 7) {
    res += "-" + body.slice(6, 8);
  }
  if (body.length >= 9) {
    res += "-" + body.slice(8, 10);
  }
  return res.trim();
}
