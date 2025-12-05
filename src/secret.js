/*
 * Simple 'Rhythm' Game, made for fun! By Tyson N.
 * Not mobile friendly.
 *
 * *ignore this file*
 */

function createItem() {
  return `
    <div class="item">
        <img src="images/secret.png" class="item-img" draggable="false" />
    </div>
    `;
}

window.onload = () => {
  for (let row = 1; row <= 5; row++) {
    const rowContainer = document.getElementById(`row-${row}`);
    if (!rowContainer) continue;
    const randomCol = Math.floor(Math.random() * 4) + 1;
    const cols = rowContainer.getElementsByClassName(`col-${randomCol}`);
    const col = cols[0];

    if (col) col.innerHTML = createItem();
  }
};

window.addEventListener("keydown", (event) => {
  const keyToCol = {
    d: 1,
    f: 2,
    j: 3,
    k: 4,
  };

  const key = event.key.toLowerCase();
  const colNum = keyToCol[key];
  if (!colNum) return;

  const bottomRow = document.getElementById("row-5");
  if (!bottomRow) return;
  const targetCols = bottomRow.getElementsByClassName(`col-${colNum}`);
  const targetCol = targetCols[0];

  if (!(targetCol && targetCol.getElementsByClassName("item").length > 0))
    return;

  targetCol.innerHTML = "";

  for (let r = 5; r > 1; r--) {
    const currentRow = document.getElementById(`row-${r}`);
    const aboveRow = document.getElementById(`row-${r - 1}`);
    if (!currentRow || !aboveRow) continue;
    for (let c = 1; c <= 4; c++) {
      const currentCol = currentRow.getElementsByClassName(`col-${c}`)[0];
      const aboveCol = aboveRow.getElementsByClassName(`col-${c}`)[0];
      if (currentCol && aboveCol) {
        currentCol.innerHTML = aboveCol.innerHTML;
        aboveCol.innerHTML = "";
      }
    }
  }

  const firstRow = document.getElementById("row-1");
  if (firstRow) {
    const randomCol = Math.floor(Math.random() * 4) + 1;
    const cols = firstRow.getElementsByClassName(`col-${randomCol}`);
    const col = cols[0];
    if (col) col.innerHTML = createItem();
  }
});

function adjustGameScale() {
  const gameContainer = document.getElementById("gameContainer");
  const buttons = document.getElementById("buttonsMobile");
  if (!gameContainer) return;

  let wrapper = document.getElementById("gameScaleWrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "gameScaleWrapper";
    gameContainer.parentNode.insertBefore(wrapper, gameContainer);
    wrapper.appendChild(gameContainer);
    if (buttons) wrapper.appendChild(buttons);
  }

  const rows = Array.from(gameContainer.querySelectorAll(".row"));
  const currentRowsHeight = rows.reduce(
    (sum, r) => sum + r.getBoundingClientRect().height,
    0
  );
  const desiredRowsHeight = window.innerHeight / 2;

  let scale = 1;
  if (currentRowsHeight > 0) scale = desiredRowsHeight / currentRowsHeight;

  wrapper.style.transform = `scale(${scale})`;

  const totalHeightAfterScale = wrapper.getBoundingClientRect().height;
  if (totalHeightAfterScale > window.innerHeight) {
    const finalScale = (scale * window.innerHeight) / totalHeightAfterScale;
    wrapper.style.transform = `scale(${finalScale})`;
  }
}

window.addEventListener("load", adjustGameScale);
window.addEventListener("resize", adjustGameScale);

if (document.readyState === "complete") adjustGameScale();
