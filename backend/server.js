const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "data.json");

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {
      clients: [],
      services: [],
      parts: [],
      mechanics: [],
      appointments: [],
      history: [],
      notifications: [],
    };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function nextId(items) {
  return items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

function getServiceDurationMinutes(services, serviceId) {
  const svc = services.find((s) => s.id === serviceId);
  const raw = svc && typeof svc.duration === "number" ? svc.duration : 0;
  if (raw > 0) return raw;
  return 60; // разумное значение по умолчанию, если длительность не задана
}

function hasMechanicOverlap(data, candidate, ignoreAppointmentId) {
  const mechanicId = Number(candidate.mechanicId || 0);
  if (!mechanicId || !candidate.datetime || !candidate.serviceId) return false;

  const start = new Date(candidate.datetime);
  if (!Number.isFinite(start.getTime())) return false;

  const durationMinutes = getServiceDurationMinutes(data.services, candidate.serviceId);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const isActiveStatus = (status) => {
    const s = (status || "").toUpperCase();
    return s !== "CANCELLED" && s !== "COMPLETED";
  };

  return data.appointments.some((a) => {
    if (ignoreAppointmentId && a.id === ignoreAppointmentId) return false;
    if (Number(a.mechanicId || 0) !== mechanicId) return false;
    if (!isActiveStatus(a.status)) return false;
    if (!a.datetime || !a.serviceId) return false;

    const aStart = new Date(a.datetime);
    if (!Number.isFinite(aStart.getTime())) return false;
    const aDurationMinutes = getServiceDurationMinutes(data.services, a.serviceId);
    const aEnd = new Date(aStart.getTime() + aDurationMinutes * 60 * 1000);

    // интервалы [start, end) и [aStart, aEnd) пересекаются
    return start < aEnd && aStart < end;
  });
}

function applyPartsWriteOff(data, requiredParts) {
  if (!Array.isArray(requiredParts) || !requiredParts.length) return;
  requiredParts.forEach((rp) => {
    const partId = Number(rp.partId || rp.id);
    const qty = Number(rp.quantity) || 0;
    if (!partId || qty <= 0) return;
    const idx = data.parts.findIndex((p) => p.id === partId);
    if (idx === -1) return;
    const currentQty = Number(data.parts[idx].quantity) || 0;
    data.parts[idx].quantity = Math.max(0, currentQty - qty);
  });
}

function addNotification(message) {
  const data = readData();
  const now = new Date();
  data.notifications.unshift({
    id: Date.now(),
    message,
    timestamp: now.toISOString(),
  });
  data.notifications = data.notifications.slice(0, 50);
  writeData(data);
}

app.post("/api/login", (req, res) => {
  const { role, employeeId, password, captcha } = req.body || {};

  const a = Number(captcha && captcha.a);
  const b = Number(captcha && captcha.b);
  const answer = Number(captcha && captcha.answer);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a + b !== answer) {
    return res.status(400).json({ error: "Неверный ответ на captcha" });
  }

  if (role !== "MANAGER" && role !== "ASSISTANT") {
    return res.status(400).json({ error: "Неизвестная роль" });
  }

  if (role === "MANAGER") {
    if (employeeId !== "manager1" || password !== "password123") {
      return res.status(401).json({ error: "Неверный ID или пароль" });
    }
  } else if (role === "ASSISTANT") {
    if (employeeId !== "mech1" || password !== "password123") {
      return res.status(401).json({ error: "Неверный ID или пароль" });
    }
  }

  const token = "autopro-demo-token";
  res.json({
    token,
    user: {
      id: role === "MANAGER" ? 1 : 2,
      role,
      name: role === "MANAGER" ? "Тест менеджер" : "Тест сотрудник",
      employeeId,
    },
  });
});

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (token !== "autopro-demo-token") {
    return res.status(401).json({ error: "Не авторизован" });
  }
  next();
}

app.use("/api", auth);

app.get("/api/dashboard", (req, res) => {
  const data = readData();
  const partsCount = data.parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const partsTotalValue = data.parts.reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.price || 0),
    0
  );

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todaysAppointments = data.appointments.filter((a) => {
    const d = new Date(a.datetime);
    return d >= todayStart && d <= todayEnd;
  });

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthlyActiveAppointments = data.appointments.filter((a) => {
    const d = new Date(a.datetime);
    const inMonth = d >= monthStart && d <= monthEnd;
    const status = (a.status || "").toUpperCase();
    const isActive = status !== "COMPLETED" && status !== "CANCELLED";
    return inMonth && isActive;
  });

  const activeAppointments = data.appointments.filter((a) => {
    const status = (a.status || "").toUpperCase();
    return status !== "COMPLETED" && status !== "CANCELLED";
  });
  const activeRevenue = activeAppointments.reduce((sum, a) => {
    const service = data.services.find((s) => s.id === a.serviceId);
    return sum + (service ? service.price || 0 : 0);
  }, 0);

  const dailyWorkMap = {};
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    dailyWorkMap[iso] = 0;
  }
  data.appointments.forEach((a) => {
    const d = new Date(a.datetime);
    if (d >= monthStart && d <= monthEnd) {
      const iso = d.toISOString().slice(0, 10);
      if (dailyWorkMap[iso] != null) {
        dailyWorkMap[iso] += 1;
      }
    }
  });
  const dailyWork = Object.keys(dailyWorkMap).map((date) => ({
    date,
    count: dailyWorkMap[date],
  }));

  const activeMechanics = data.mechanics.filter((m) => m.active);

  res.json({
    partsCount,
    partsTotalValue,
    appointments: data.appointments.length,
    monthlyActiveAppointments: monthlyActiveAppointments.length,
    activeRevenue,
    dailyWork,
    todaysAppointments,
    activeMechanics,
  });
});

app.get("/api/clients", (req, res) => {
  const data = readData();
  res.json(data.clients);
});

app.post("/api/clients", (req, res) => {
  const data = readData();
  const client = {
    id: nextId(data.clients),
    name: req.body.name,
    phone: req.body.phone,
    note: req.body.note || "",
  };
  data.clients.push(client);
  writeData(data);
  res.status(201).json(client);
});

app.put("/api/clients/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const idx = data.clients.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "Клиент не найден" });
  data.clients[idx] = { ...data.clients[idx], ...req.body };
  writeData(data);
  res.json(data.clients[idx]);
});

app.delete("/api/clients/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  data.clients = data.clients.filter((c) => c.id !== id);
  writeData(data);
  res.status(204).end();
});

app.get("/api/services", (req, res) => {
  const data = readData();
  res.json(data.services);
});

app.post("/api/services", (req, res) => {
  const data = readData();
  const service = {
    id: nextId(data.services),
    name: req.body.name,
    description: req.body.description || "",
    duration: Number(req.body.duration) || 0,
    price: Number(req.body.price) || 0,
  };
  data.services.push(service);
  writeData(data);
  res.status(201).json(service);
});

app.put("/api/services/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const idx = data.services.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Услуга не найдена" });
  data.services[idx] = { ...data.services[idx], ...req.body };
  writeData(data);
  res.json(data.services[idx]);
});

app.delete("/api/services/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  data.services = data.services.filter((s) => s.id !== id);
  writeData(data);
  res.status(204).end();
});

app.get("/api/parts", (req, res) => {
  const data = readData();
  res.json(data.parts);
});

app.post("/api/parts", (req, res) => {
  const data = readData();
  const part = {
    id: nextId(data.parts),
    article: req.body.article,
    name: req.body.name,
    price: Number(req.body.price) || 0,
    quantity: Number(req.body.quantity) || 0,
  };
  data.parts.push(part);
  writeData(data);
  addNotification(
    `Добавлена позиция на склад: ${part.article || ""} ${part.name || ""} (кол-во ${
      part.quantity
    })`
  );
  res.status(201).json(part);
});

app.put("/api/parts/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const idx = data.parts.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Позиция не найдена" });
  const prev = data.parts[idx];
  data.parts[idx] = { ...prev, ...req.body };
  const next = data.parts[idx];
  const prevQty = Number(prev.quantity) || 0;
  const nextQty = Number(next.quantity) || 0;
  if (prevQty !== nextQty) {
    addNotification(
      `Изменён остаток на складе: ${next.article || ""} ${
        next.name || ""
      } (${prevQty} → ${nextQty})`
    );
  }
  writeData(data);
  res.json(data.parts[idx]);
});

app.delete("/api/parts/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const part = data.parts.find((p) => p.id === id);
  data.parts = data.parts.filter((p) => p.id !== id);
  writeData(data);
  if (part) {
    addNotification(
      `Позиция удалена со склада: ${part.article || ""} ${part.name || ""}`
    );
  }
  res.status(204).end();
});

app.get("/api/mechanics", (req, res) => {
  const data = readData();
  res.json(data.mechanics);
});

app.post("/api/mechanics", (req, res) => {
  const data = readData();
  const mechanic = {
    id: nextId(data.mechanics),
    fullName: req.body.fullName,
    position: req.body.position || "",
    hireDate: req.body.hireDate || "",
    active: !!req.body.active,
  };
  data.mechanics.push(mechanic);
  writeData(data);
  addNotification(`Добавлен механик: ${mechanic.fullName || "Без имени"}`);
  res.status(201).json(mechanic);
});

app.put("/api/mechanics/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const idx = data.mechanics.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: "Механик не найден" });
  const prev = data.mechanics[idx];
  data.mechanics[idx] = { ...prev, ...req.body };
  const next = data.mechanics[idx];
  if (typeof req.body.active === "boolean" && prev.active !== next.active) {
    addNotification(
      `Статус механика ${next.fullName || "—"}: ${
        next.active ? "активен" : "неактивен"
      }`
    );
  }
  writeData(data);
  res.json(data.mechanics[idx]);
});

app.delete("/api/mechanics/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  data.mechanics = data.mechanics.filter((m) => m.id !== id);
  writeData(data);
  res.status(204).end();
});

app.get("/api/appointments", (req, res) => {
  const data = readData();
  res.json(data.appointments);
});

app.post("/api/appointments", (req, res) => {
  const data = readData();
  const appointment = {
    id: nextId(data.appointments),
    datetime: req.body.datetime,
    clientName: req.body.clientName,
    phone: req.body.phone || "",
    carModel: req.body.carModel || "",
    carYear: req.body.carYear || "",
    licensePlate: req.body.licensePlate || "",
    vin: req.body.vin || "",
    serviceId: req.body.serviceId || null,
    mechanicId: req.body.mechanicId || null,
    status: req.body.status || "CREATED",
    comment: req.body.comment || "",
    requiredParts: Array.isArray(req.body.requiredParts)
      ? req.body.requiredParts.map((rp) => ({
          partId: Number(rp.partId || rp.id) || null,
          quantity: Number(rp.quantity) || 0,
        }))
      : [],
  };

  if (hasMechanicOverlap(data, appointment)) {
    return res
      .status(400)
      .json({ error: "Механик уже занят в это время для выбранной услуги" });
  }

  data.appointments.push(appointment);
  data.history.push({
    id: nextId(data.history),
    appointmentId: appointment.id,
    datetime: appointment.datetime,
    licensePlate: appointment.licensePlate,
    serviceId: appointment.serviceId,
    mechanicId: appointment.mechanicId,
    status: appointment.status,
  });
  if ((appointment.status || "").toUpperCase() === "COMPLETED") {
    applyPartsWriteOff(data, appointment.requiredParts);
  }
  writeData(data);
  const when = new Date(appointment.datetime || Date.now()).toLocaleString(
    "ru-RU",
    { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );
  addNotification(
    `Новая запись: ${when}, клиент ${appointment.clientName || "—"}, авто ${
      appointment.carModel || "—"
    }`
  );
  res.status(201).json(appointment);
});

app.put("/api/appointments/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const idx = data.appointments.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: "Запись не найдена" });
  const prev = data.appointments[idx];
  const next = {
    ...prev,
    ...req.body,
  };
  if (Array.isArray(req.body.requiredParts)) {
    next.requiredParts = req.body.requiredParts.map((rp) => ({
      partId: Number(rp.partId || rp.id) || null,
      quantity: Number(rp.quantity) || 0,
    }));
  }
  if (hasMechanicOverlap(data, next, id)) {
    return res
      .status(400)
      .json({ error: "Механик уже занят в это время для выбранной услуги" });
  }

  data.appointments[idx] = next;
  const prevStatus = (prev.status || "").toUpperCase();
  const nextStatus = (next.status || "").toUpperCase();
  if (prevStatus !== "COMPLETED" && nextStatus === "COMPLETED") {
    applyPartsWriteOff(data, next.requiredParts);
  }
   if (prevStatus !== nextStatus) {
    addNotification(
      `Статус записи #${id} изменён: ${prevStatus || "—"} → ${nextStatus || "—"}`
    );
  }
  writeData(data);
  res.json(data.appointments[idx]);
});

app.delete("/api/appointments/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  data.appointments = data.appointments.filter((a) => a.id !== id);
  writeData(data);
  addNotification("Запись в расписании удалена");
  res.status(204).end();
});

app.get("/api/history", (req, res) => {
  const data = readData();
  const plate = ((req.query.plate || "") + "").trim();
  let items = data.history;
  if (plate) {
    items = items.filter(
      (h) => (h.licensePlate || "").toLowerCase() === plate.toLowerCase()
    );
  }
  // показываем только завершённые обслуживания
  items = items.filter(
    (h) => (h.status || "").toUpperCase() === "COMPLETED"
  );

  const detailed = items.map((h) => {
    const appointment = data.appointments.find(
      (a) => a.id === h.appointmentId
    );
    return {
      ...h,
      appointment: appointment || null,
    };
  });

  res.json(detailed);
});

app.get("/api/notifications", (req, res) => {
  const data = readData();
  res.json(data.notifications);
});

app.delete("/api/notifications", (req, res) => {
  const data = readData();
  data.notifications = [];
  writeData(data);
  res.status(204).end();
});

app.get("/api/reports", (req, res) => {
  const data = readData();
  const period = (req.query.period || "").toString(); // YYYY-MM
  const items = data.history.filter((h) => {
    if (!period) return true;
    if (!h.datetime) return false;
    return h.datetime.startsWith(period);
  });

  let revenue = 0;
  const byService = {};
  const byMechanic = {};
  let totalPayroll = 0;
  items.forEach((h) => {
    const service = data.services.find((s) => s.id === h.serviceId);
    if (service) {
      revenue += service.price || 0;
      if (!byService[service.name]) {
        byService[service.name] = { name: service.name, count: 0, revenue: 0 };
      }
      byService[service.name].count += 1;
      byService[service.name].revenue += service.price || 0;
    }

    const mech = data.mechanics.find((m) => m.id === h.mechanicId);
    if (mech) {
      const id = mech.id;
      if (!byMechanic[id]) {
        const baseSalary =
          typeof mech.baseSalary === "number" ? mech.baseSalary : 60000;
        const bonusPerService =
          typeof mech.bonusPerService === "number" ? mech.bonusPerService : 500;
        byMechanic[id] = {
          id,
          name: mech.fullName,
          position: mech.position || "",
          baseSalary,
          bonusPerService,
          completedCount: 0,
          bonusTotal: 0,
          totalSalary: 0,
        };
      }
      const row = byMechanic[id];
      row.completedCount += 1;
      row.bonusTotal = row.completedCount * row.bonusPerService;
      row.totalSalary = row.baseSalary + row.bonusTotal;
    }
  });

  totalPayroll = Object.values(byMechanic).reduce(
    (sum, row) => sum + (row.totalSalary || 0),
    0
  );

  res.json({
    period,
    revenue,
    completedCount: items.length,
    byService: Object.values(byService),
    totalPayroll,
    byMechanic: Object.values(byMechanic),
  });
});

app.listen(PORT, () => {
  console.log(`AutoPro backend listening on http://localhost:${PORT}`);
});

