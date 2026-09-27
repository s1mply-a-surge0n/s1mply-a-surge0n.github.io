const API_URL =
  "https://script.google.com/macros/s/AKfycbzpoHExr9Oi82mIoxGQkN2MJjWTpPJjbEbqY-6w1FOsdpMWXyTvxzoCroCuURrI3mgH/exec";


let appData = {
  config: [],
  seats: {}
};

let adminPassword = "";
let selectedSectionId = null;


/* =====================================================
   INIT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  loadData
);


/* =====================================================
   LOAD DATA
===================================================== */

async function loadData() {

  showStatus(
    "Đang tải dữ liệu...",
    "info"
  );

  try {

    const response = await fetch(
      API_URL + "?action=getData"
    );

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message);
    }

    appData.config = data.config || [];
    appData.seats = data.seats || {};

    renderSeatMap();

    hideStatus();

  } catch (error) {

    console.error(error);

    showStatus(
      "Không thể kết nối Google Sheet.",
      "danger"
    );
  }
}


/* =====================================================
   RENDER SEAT MAP
===================================================== */

function renderSeatMap() {

  const container =
    document.getElementById(
      "sectionsContainer"
    );

  container.innerHTML = "";

  const sections = getSections();


  sections.forEach(section => {

    const card =
      document.createElement("div");

    card.className = "section-card";


    const title =
      document.createElement("div");

    title.className = "section-title";

    title.textContent =
      section.name;

    card.appendChild(title);


    const grid =
      document.createElement("div");

    grid.className = "seat-grid";

    grid.style.gridTemplateColumns =
      `repeat(${section.maxCol}, 60px)`;


    section.items.forEach(item => {

      const seat =
        document.createElement("div");

      seat.className =
        "seat available";

      const occupied =
        appData.seats[item.id];


      if (occupied) {

        seat.className =
          "seat occupied";

      }


      seat.innerHTML = `
        <div class="seat-number">
          ${escapeHtml(item.label)}
        </div>

        <div class="seat-name">
          ${
            occupied
              ? escapeHtml(occupied.name)
              : "Trống"
          }
        </div>
      `;


      seat.onclick = () =>
        handleSeatClick(item);


      seat.style.gridColumn =
        item.col;

      seat.style.gridRow =
        item.row;


      grid.appendChild(seat);

    });


    card.appendChild(grid);

    container.appendChild(card);

  });

}


/* =====================================================
   GROUP SECTIONS
===================================================== */

function getSections() {

  const map = {};

  appData.config.forEach(item => {

    if (!map[item.section_id]) {

      map[item.section_id] = {
        id: item.section_id,
        name: item.section_name,
        items: [],
        maxCol: 1
      };

    }

    map[item.section_id]
      .items
      .push(item);

    map[item.section_id].maxCol =
      Math.max(
        map[item.section_id].maxCol,
        Number(item.col)
      );

  });


  return Object.values(map);

}


/* =====================================================
   BOOK / CANCEL
===================================================== */

async function handleSeatClick(item) {

  const occupied =
    appData.seats[item.id];


  if (occupied) {

    const confirmCancel =
      confirm(
        `Ghế ${item.label} đang được chọn bởi "${occupied.name}".\n\nHủy ghế này?`
      );

    if (confirmCancel) {
      await cancelSeat(item.id);
    }

    return;
  }


  const name =
    prompt(
      `Bạn đang chọn ghế ${item.label}.\n\nNhập tên của bạn:`
    );


  if (
    !name ||
    !name.trim()
  ) {
    return;
  }


  await bookSeat(
    item.id,
    name.trim()
  );

}


async function bookSeat(
  seatId,
  name
) {

  showStatus(
    "Đang đăng ký ghế...",
    "info"
  );


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body: JSON.stringify({
            action: "book",
            seatId,
            name
          })
        }
      );


    const data =
      await response.json();


    if (data.status !== "success") {
      throw new Error(data.message);
    }


    await loadData();


    showStatus(
      "Đã đặt ghế thành công!",
      "success"
    );


  } catch (error) {

    showStatus(
      error.message ||
      "Không thể đặt ghế.",
      "danger"
    );

  }

}


async function cancelSeat(
  seatId
) {

  showStatus(
    "Đang hủy ghế...",
    "info"
  );


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body: JSON.stringify({
            action: "cancel",
            seatId
          })
        }
      );


    const data =
      await response.json();


    if (data.status !== "success") {
      throw new Error(data.message);
    }


    await loadData();


    showStatus(
      "Đã hủy ghế.",
      "success"
    );


  } catch (error) {

    showStatus(
      error.message ||
      "Không thể hủy ghế.",
      "danger"
    );

  }

}


/* =====================================================
   ADMIN LOGIN
===================================================== */

function openAdminLogin() {

  document.getElementById(
    "adminPassword"
  ).value = "";


  new bootstrap.Modal(
    document.getElementById(
      "adminLoginModal"
    )
  ).show();

}


async function loginAdmin() {

  const password =
    document.getElementById(
      "adminPassword"
    ).value.trim();


  if (!password) {
    alert("Vui lòng nhập mật khẩu.");
    return;
  }


  /*
   * Ta không có API login riêng.
   * Gửi thử saveConfig với config hiện tại.
   * Nếu server trả success → password đúng.
   */

  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({
          action: "saveConfig",
          adminPassword: password,
          config: appData.config
        })
      }
    );


  const data =
    await response.json();


  if (data.status !== "success") {

    alert(
      "Sai mật khẩu admin."
    );

    return;
  }


  adminPassword = password;


  bootstrap.Modal
    .getInstance(
      document.getElementById(
        "adminLoginModal"
      )
    )
    .hide();


  openAdminPanel();

}


/* =====================================================
   ADMIN PANEL
===================================================== */

function openAdminPanel() {

  renderAdminSections();

  renderSectionEditor();


  new bootstrap.Modal(
    document.getElementById(
      "adminModal"
    )
  ).show();

}


function renderAdminSections() {

  const container =
    document.getElementById(
      "adminSections"
    );

  container.innerHTML = "";


  getSections().forEach(section => {

    const div =
      document.createElement("div");

    div.className =
      "admin-section-item";


    if (
      section.id ===
      selectedSectionId
    ) {
      div.classList.add("active");
    }


    div.innerHTML = `
      <strong>
        ${escapeHtml(section.name)}
      </strong>

      <br>

      <small class="text-muted">
        ${section.items.length} ghế
      </small>
    `;


    div.onclick = () => {

      selectedSectionId =
        section.id;

      renderAdminSections();

      renderSectionEditor();

    };


    container.appendChild(div);

  });

}


/* =====================================================
   SECTION EDITOR
===================================================== */

function renderSectionEditor() {

  const editor =
    document.getElementById(
      "sectionEditor"
    );


  if (!selectedSectionId) {

    editor.innerHTML = `
      <div class="text-muted text-center py-5">
        Chọn một khu vực để chỉnh sửa.
      </div>
    `;

    return;
  }


  const section =
    getSections()
      .find(
        s =>
          s.id ===
          selectedSectionId
      );


  if (!section) return;


  editor.innerHTML = `

    <div class="admin-editor">

      <h5>
        ${escapeHtml(section.name)}
      </h5>

      <hr>

      <div class="mb-3">

        <label class="form-label">
          Tên khu vực
        </label>

        <input
          id="editSectionName"
          class="form-control"
          value="${escapeAttribute(section.name)}"
        >

      </div>


      <div class="row">

        <div class="col-md-6">

          <label class="form-label">
            Số hàng
          </label>

          <input
            id="editRows"
            type="number"
            min="1"
            class="form-control"
            value="${getMaxRow(section)}"
          >

        </div>


        <div class="col-md-6">

          <label class="form-label">
            Số cột
          </label>

          <input
            id="editCols"
            type="number"
            min="1"
            class="form-control"
            value="${section.maxCol}"
          >

        </div>

      </div>


      <div class="mt-3">

        <button
          class="btn btn-primary"
          onclick="generateGrid()"
        >
          Tạo lại grid
        </button>

        <button
          class="btn btn-outline-danger ms-2"
          onclick="deleteSection()"
        >
          Xóa khu vực
        </button>

      </div>


      <div
        id="gridPreview"
        class="admin-preview"
      ></div>

    </div>

  `;


  renderGridPreview(section);

}


function getMaxRow(section) {

  return Math.max(
    ...section.items.map(
      item =>
        Number(item.row)
    ),
    1
  );

}


/* =====================================================
   GENERATE GRID
===================================================== */

function generateGrid() {

  const section =
    getSections()
      .find(
        s =>
          s.id ===
          selectedSectionId
      );


  if (!section) return;


  const name =
    document.getElementById(
      "editSectionName"
    ).value.trim();


  const rows =
    Number(
      document.getElementById(
        "editRows"
      ).value
    );


  const cols =
    Number(
      document.getElementById(
        "editCols"
      ).value
    );


  if (
    !name ||
    rows < 1 ||
    cols < 1
  ) {

    alert(
      "Thông tin không hợp lệ."
    );

    return;
  }


  const newItems = [];


  for (
    let row = 1;
    row <= rows;
    row++
  ) {

    for (
      let col = 1;
      col <= cols;
      col++
    ) {

      const old =
        section.items.find(
          item =>
            Number(item.row) === row &&
            Number(item.col) === col
        );


      newItems.push({

        id:
          old?.id ||
          `${section.id}_${row}_${col}`,

        section_id:
          section.id,

        section_name:
          name,

        type:
          "seat",

        row,

        col,

        label:
          old?.label ||
          `${numberToLetter(row)}${col}`,

        enabled:
          true

      });

    }

  }


  /*
   * Xóa config cũ của section
   */

  appData.config =
    appData.config.filter(
      item =>
        item.section_id !==
        section.id
    );


  appData.config.push(
    ...newItems
  );


  renderAdminSections();

  renderSectionEditor();

}


/* =====================================================
   ADD SECTION
===================================================== */

function addSection() {

  const id =
    "SEC_" +
    Date.now();


  appData.config.push({

    id:
      `${id}_1_1`,

    section_id:
      id,

    section_name:
      "Khu vực mới",

    type:
      "seat",

    row:
      1,

    col:
      1,

    label:
      "A1",

    enabled:
      true

  });


  selectedSectionId =
    id;


  renderAdminSections();

  renderSectionEditor();

}


/* =====================================================
   DELETE SECTION
===================================================== */

function deleteSection() {

  if (!selectedSectionId)
    return;


  const section =
    getSections()
      .find(
        s =>
          s.id ===
          selectedSectionId
      );


  if (
    !confirm(
      `Xóa khu vực "${section.name}"?`
    )
  ) {
    return;
  }


  appData.config =
    appData.config.filter(
      item =>
        item.section_id !==
        selectedSectionId
    );


  selectedSectionId =
    null;


  renderAdminSections();

  renderSectionEditor();

}


/* =====================================================
   PREVIEW
===================================================== */

function renderGridPreview(section) {

  const preview =
    document.getElementById(
      "gridPreview"
    );


  if (!preview) return;


  preview.innerHTML = `
    <strong>
      Preview
    </strong>

    <div
      class="preview-grid mt-3"
      style="
        grid-template-columns:
        repeat(${section.maxCol}, 55px);
      "
    >

      ${section.items.map(item => `
        <div
          class="preview-seat"
          style="
            grid-column:${item.col};
            grid-row:${item.row};
          "
        >
          ${escapeHtml(item.label)}
        </div>
      `).join("")}

    </div>
  `;

}


/* =====================================================
   SAVE LAYOUT
===================================================== */

async function saveLayout() {

  if (!adminPassword) {

    alert(
      "Phiên admin đã hết."
    );

    return;
  }


  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body: JSON.stringify({

            action:
              "saveConfig",

            adminPassword:
              adminPassword,

            config:
              appData.config

          })
        }
      );


    const data =
      await response.json();


    if (
      data.status !==
      "success"
    ) {

      throw new Error(
        data.message
      );

    }


    alert(
      "Đã lưu cấu trúc thành công."
    );


    await loadData();


    bootstrap.Modal
      .getInstance(
        document.getElementById(
          "adminModal"
        )
      )
      .hide();


  } catch (error) {

    alert(
      error.message ||
      "Không thể lưu."
    );

  }

}


/* =====================================================
   UTILITIES
===================================================== */

function numberToLetter(number) {

  let result = "";

  while (number > 0) {

    const remainder =
      (number - 1) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) + result;

    number =
      Math.floor(
        (number - 1) / 26
      );

  }

  return result;

}


function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return escapeHtml(value);

}


function showStatus(
  message,
  type
) {

  const el =
    document.getElementById(
      "statusMsg"
    );


  el.className =
    `alert alert-${type} text-center`;


  el.textContent =
    message;

}


function hideStatus() {

  document.getElementById(
    "statusMsg"
  ).classList.add("d-none");

}
