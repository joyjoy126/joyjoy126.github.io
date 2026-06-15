let video;
let handpose; 
let predictions = []; // 
let fallingItems = [];
let lastSpawnTime = 0;
const SPAWN_COOLDOWN = 300;
const MAX_ITEMS = 30;
let itemImages = {};
const ITEM_TYPES = ['cat', 'dog'];

function preload() {
  itemImages.cat    = loadImage('小猫.png');
  itemImages.dog    = loadImage('小狗.png');
}
// 计算画布尺寸，以窗口大小为自变量
function calcCanvasSize() {
  let w = min(windowWidth * 0.85, windowHeight * 0.8 * 4 / 3);
  let h = w * 3 / 4;
  w = min(w, 640);
  h = min(h, 480);
  return { w: floor(w), h: floor(h) };
}

// p5.js 自动调用的函数，用于初始化环境 只执行一次
// 页面加载完成后有p5.js调用
function setup() {
  let size = calcCanvasSize();  // 获取画布尺寸
  itemImages.cat.resize(100, 0);
  itemImages.dog.resize(100, 0);
  pixelDensity(1);
  createCanvas(size.w, size.h);  // 创建画布 此时size参数的值传入了canvas内部，成为全局变量width和height
  frameRate(20);  // 
  video = createCapture(VIDEO);  // 创建视频捕获对象，用于获取摄像头输入，会在页面上生成一个原生video画面
  video.size(width, height);
  video.hide();

  // 初始化 ml5 handpose 模型
  handpose = ml5.handpose(video, modelReady);
  // 监听预测结果
  handpose.on("predict", gotHands);  // 事件名、回调函数
  // 模型推理完成=识别到手部并保存手部关键点数据->调用回调函数
}

// 窗口大小变化时重新计算画布尺寸
function windowResized() {
  let size = calcCanvasSize();
  resizeCanvas(size.w, size.h);
  if (video) {
    video.size(width, height);
  }
}
function modelReady() {
  console.log('Model ready!');
}
// (并行) 摄像头每一帧 → ml5.js 检测到手 → 自动调用 gotHands(results)
// 每当检测到手部关键点时触发，每帧一次
// ml5事件循环
function gotHands(results) {
  // 每当检测到手部时触发。获取大拇指尖（索引 4）和食指尖（索引 8）的坐标，计算两点距离。若距离在 50~100 像素之间，则生成 5 个随机雨滴。
  predictions = results; // 保存预测结果
  if (predictions.length > 0) {
    // handpose 关键点索引和原 HandTracking 一致（4=大拇指尖，8=食指尖）
    let thumb = predictions[0].landmarks[4];
    let index = predictions[0].landmarks[8];
    let distance = dist(thumb[0], thumb[1], index[0], index[1]);
    
    if (distance > 50 && distance < 100) {
      let now = millis();
      if (now - lastSpawnTime < SPAWN_COOLDOWN) return;
      if (fallingItems.length >= MAX_ITEMS) return;
      lastSpawnTime = now;
      for (let i = 0; i < 3; i++) {
        fallingItems.push({
          x: random(width * 0.1, width * 0.9),
          y: -30,
          speed: random(40, 50),
          size: random(12, 25),
          type: random(ITEM_TYPES),
          state: 'falling',
          dir: random() > 0.5 ? 1 : -1,
          vx: 0,
          alpha: 255
        });
      }
    }
  }
}
// p5.js 启动渲染循环，每帧自动调用 draw()  ───── 约 60 次/秒
// 每帧自动调用 draw() 函数，绘制雨滴和视频
function draw() {
  // print(frameRate());  // 控制台输出实际 fps
  background(220);  
  image(video, 0, 0, width, height);

  for (let i = 0; i < fallingItems.length; i++) {
    let it = fallingItems[i];
    if (it.state === 'falling') {
      it.y += it.speed;
      if (it.y > height * 0.95) {
        it.state = 'spreading';
        it.vx = it.dir * random(8, 15);
      }
    } else {
      it.x += it.vx;
      it.y += it.speed * 0.5;
      it.alpha -= 12;
    }
    let img = itemImages[it.type];
    if (img) {
      if (it.alpha < 255) {
        tint(255, it.alpha);
        image(img, it.x - it.size / 2, it.y - it.size / 2, it.size, it.size);
        noTint();
      } else {
        image(img, it.x - it.size / 2, it.y - it.size / 2, it.size, it.size);
      }
    }
    if (it.alpha <= 0 || it.y > height + 60 || it.x < -60 || it.x > width + 60) {
      fallingItems.splice(i, 1);
      i--;
    }
  }
}