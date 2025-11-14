function createItem() {
  return `
    <div class="item">
        <img src="images/secret.png" class="item-img" draggable="false" />
    </div>
    `;
}

// On window load, populate random columns in each row with items
window.onload = () => {
  // iterate rows that actually exist in the HTML (row-1 .. row-5)
  for (let row = 1; row <= 5; row++) {
    const rowContainer = document.getElementById(`row-${row}`);
    if (!rowContainer) continue;

    // pick an integer column 1..4
    const randomCol = Math.floor(Math.random() * 4) + 1;
    const cols = rowContainer.getElementsByClassName(`col-${randomCol}`);
    const col = cols[0];

    if (col) col.innerHTML = createItem();
  }
};

//KEYS FOR EACH COLUMN 1-D, 2-F, 3-J, 4-K
//when a key is pressed, if an item in is that column, remove it
//and increment the score by 1, and add one more item to
// a random column in a first row, and move all other items down one row

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

  // Only check the fifth (bottom) row
  const bottomRow = document.getElementById("row-5");
  if (!bottomRow) return;
  const targetCols = bottomRow.getElementsByClassName(`col-${colNum}`);
  const targetCol = targetCols[0];

  // If there's no item in the bottom row's column, do nothing
  if (!(targetCol && targetCol.getElementsByClassName("item").length > 0))
    return;

  // Remove the item from the bottom row
  targetCol.innerHTML = "";

  // Move items down one row (row 1 -> 2, 2 -> 3, ..., 4 -> 5)
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

  // Add one new item to a random column in the first row
  const firstRow = document.getElementById("row-1");
  if (firstRow) {
    const randomCol = Math.floor(Math.random() * 4) + 1;
    const cols = firstRow.getElementsByClassName(`col-${randomCol}`);
    const col = cols[0];
    if (col) col.innerHTML = createItem();
  }
});

// (keeps your existing logic; this adds a small resize/scale helper)

function adjustGameScale() {
  const gameContainer = document.getElementById("gameContainer");
  const buttons = document.getElementById("buttonsMobile");
  if (!gameContainer) return;

  // create wrapper once and place gameContainer (+ buttons) inside it
  let wrapper = document.getElementById("gameScaleWrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "gameScaleWrapper";
    gameContainer.parentNode.insertBefore(wrapper, gameContainer);
    wrapper.appendChild(gameContainer);
    if (buttons) wrapper.appendChild(buttons);
  }

  // measure current rows total height
  const rows = Array.from(gameContainer.querySelectorAll(".row"));
  const currentRowsHeight = rows.reduce(
    (sum, r) => sum + r.getBoundingClientRect().height,
    0
  );
  const desiredRowsHeight = window.innerHeight / 2; // rows must fit into 1/2 vh

  // compute scale so rows fill exactly 1/2 of viewport (unless tiny)
  let scale = 1;
  if (currentRowsHeight > 0) scale = desiredRowsHeight / currentRowsHeight;

  // apply initial scale
  wrapper.style.transform = `scale(${scale})`;

  // if scaled rows + buttons still exceed viewport, reduce scale to fit everything
  const totalHeightAfterScale = wrapper.getBoundingClientRect().height;
  if (totalHeightAfterScale > window.innerHeight) {
    const finalScale = (scale * window.innerHeight) / totalHeightAfterScale;
    wrapper.style.transform = `scale(${finalScale})`;
  }
}

// run on load and resize
window.addEventListener("load", adjustGameScale);
window.addEventListener("resize", adjustGameScale);

// call once in case window.onload in your file already populated rows earlier
if (document.readyState === "complete") adjustGameScale();
