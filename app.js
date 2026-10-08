const $ = id => document.getElementById(id);
const cpf = $("cpf"), card = $("card"), expiry = $("expiry");
const name = $("name");
const cpfIcon = $("cpfIcon"), cpfHint = $("cpfHint");
const cardIcon = $("cardIcon"), cardHint = $("cardHint");

function setFieldState(input, icon, hint, state, message) {
  input.classList.remove("field-ok", "field-err");
  icon.classList.remove("show", "ok", "err");
  hint.classList.remove("ok", "err");
  if (!state) {
    icon.textContent = "";
    hint.textContent = "";
    return;
  }
  input.classList.add(state === "ok" ? "field-ok" : "field-err");
  icon.classList.add("show", state);
  icon.textContent = state === "ok" ? "✓" : "!";
  hint.classList.add(state);
  hint.textContent = message || "";
}

function cpfValid(x) {
  x = x.replace(/\D/g, "");
  if (x.length !== 11) return false;
  if (/^(\d)\1+$/.test(x)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +x[i] * (10 - i);
  let d = (s * 10) % 11;
  d = d === 10 ? 0 : d;
  if (d !== +x[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +x[i] * (11 - i);
  d = (s * 10) % 11;
  d = d === 10 ? 0 : d;
  return d === +x[10];
}

function luhnOk(number) {
  const digits = number.replace(/\D/g, "").split("").map(Number);
  if (digits.length < 13 || digits.length > 19) return false;
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[digits.length - 1 - i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}

function validateCpfLive() {
  const raw = cpf.value.replace(/\D/g, "");
  if (raw.length === 0) {
    setFieldState(cpf, cpfIcon, cpfHint, null);
    return;
  }
  if (raw.length < 11) {
    setFieldState(cpf, cpfIcon, cpfHint, null);
    cpfHint.textContent = `${raw.length}/11 dígitos`;
    return;
  }
  if (/^(\d)\1+$/.test(raw)) {
    setFieldState(cpf, cpfIcon, cpfHint, "err", "CPF com dígitos repetidos é inválido");
    return;
  }
  if (cpfValid(raw)) {
    setFieldState(cpf, cpfIcon, cpfHint, "ok", "CPF válido");
  } else {
    setFieldState(cpf, cpfIcon, cpfHint, "err", "CPF inválido — dígitos verificadores não conferem");
  }
}

function validateCardLive() {
  const raw = card.value.replace(/\D/g, "");
  if (raw.length === 0) {
    setFieldState(card, cardIcon, cardHint, null);
    return;
  }
  if (raw.length < 13) {
    setFieldState(card, cardIcon, cardHint, null);
    cardHint.textContent = `${raw.length} dígitos`;
    return;
  }
  if (luhnOk(raw)) {
    setFieldState(card, cardIcon, cardHint, "ok", "Número válido");
  } else {
    setFieldState(card, cardIcon, cardHint, "err", "Número do cartão inválido");
  }
}

cpf.addEventListener("input", e => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4");
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, "$1.$2");
  e.target.value = v;
  validateCpfLive();
});

cpf.addEventListener("blur", validateCpfLive);

card.addEventListener("input", e => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 16);
  e.target.value = v.replace(/(.{4})/g, "$1 ").trim();
  $("previewNumber").textContent = (v + "••••••••••••••••").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const brand =
    v.startsWith("4") ? "VISA" :
    v.startsWith("5") || (v.length >= 4 && +v.slice(0, 4) >= 2221 && +v.slice(0, 4) <= 2720) ? "MASTERCARD" :
    v.startsWith("34") || v.startsWith("37") ? "AMEX" :
    "CARD";
  $("previewBrand").textContent = brand;
  validateCardLive();
});

card.addEventListener("blur", validateCardLive);

expiry.addEventListener("input", e => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
  e.target.value = v;
  $("previewExp").textContent = v || "MM/AA";
});

name.addEventListener("input", e =>
  $("previewName").textContent = (e.target.value || "TITULAR").toUpperCase().slice(0, 24)
);

function show(msg, ok = false) {
  const r = $("result");
  r.className = "result " + (ok ? "ok" : "err");
  r.innerHTML = msg;
  r.style.display = "block";
}

$("walletForm").addEventListener("submit", async e => {
  e.preventDefault();
  validateCpfLive();
  validateCardLive();

  const rawCpf = cpf.value.replace(/\D/g, "");
  if (rawCpf.length !== 11) {
    return show("Informe o CPF completo (11 dígitos).");
  }
  if (/^(\d)\1+$/.test(rawCpf)) {
    return show("CPF com todos os dígitos iguais é inválido.");
  }
  if (!cpfValid(rawCpf)) {
    return show("CPF inválido. Verifique os dígitos e tente novamente.");
  }

  const rawCard = card.value.replace(/\D/g, "");
  if (!luhnOk(rawCard)) {
    return show("Número do cartão inválido.");
  }

  try {
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holder_name: name.value,
        cpf: cpf.value,
        birth_date: $("birth").value,
        card_number: card.value,
        expiry: expiry.value,
        cvv: $("cvv").value
      })
    });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Não foi possível criar a carteira.");
    show(
      `✓ Carteira criada.<br><b>${data.wallet_id}</b><br>Token: ${data.token}<br>${data.brand} •••• ${data.last4}`,
      true
    );
    e.target.reset();
    $("previewNumber").textContent = "•••• •••• •••• ••••";
    $("previewExp").textContent = "MM/AA";
    $("previewName").textContent = "TITULAR";
    $("previewBrand").textContent = "CARD";
    setFieldState(cpf, cpfIcon, cpfHint, null);
    setFieldState(card, cardIcon, cardHint, null);
    loadWallets();
  } catch (err) {
    show("Servidor indisponível. Execute o Flask primeiro.");
  }
});

async function loadWallets() {
  const box = $("wallets");
  try {
    const rows = await (await fetch("/api/wallets")).json();
    box.innerHTML = rows.length
      ? rows
          .map(
            w =>
              `<div class="wallet"><div><strong>${w.holder_name}</strong><small>${w.wallet_id}</small></div><div class="last">${w.brand} •••• ${w.last4}</div></div>`
          )
          .join("")
      : "<div class='wallet'><small>Nenhuma carteira criada ainda.</small></div>";
  } catch {
    box.innerHTML = "<div class='wallet'><small>Execute o servidor para carregar.</small></div>";
  }
}

$("refresh").onclick = loadWallets;
loadWallets();
