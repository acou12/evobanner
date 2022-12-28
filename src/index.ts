const canvas = document.querySelector("canvas")!;
canvas.width = 800;
canvas.height = 800;
const c = canvas.getContext("2d")!;

const MUTATION_RATE = 0.2;

type Pattern = {
  color: number;
  data: ImageData;
};

class Banner {
  constructor(public patterns: Pattern[] = []) {}

  copy() {
    return new Banner(this.patterns.map((pattern) => ({ ...pattern })));
  }

  data() {
    const canvas = document.createElement("canvas");
    canvas.width = PATTERN_WIDTH;
    canvas.height = PATTERN_HEIGHT;
    const context = canvas.getContext("2d")!;
    this.patterns.forEach((pattern) => {
      context.drawImage(imageFromData(pattern.data, pattern.color), 0, 0);
    });
    return context.getImageData(0, 0, PATTERN_WIDTH, PATTERN_HEIGHT);
  }

  cost(data: ImageData) {
    const theirData = data.data;
    let cost = 0;
    for (let i = 0; i < theirData.length / 4; i++) {
      let bannerIndex = this.patterns.length - 1;
      while (
        bannerIndex >= 0 &&
        this.patterns[bannerIndex].data.data[i * 4 + 3] === 0
      ) {
        bannerIndex--;
      }
      if (!(bannerIndex >= 0))
        for (let j = 0; j < 3; j++) {
          cost += Math.pow(256 - theirData[i * 4 + j], 2);
        }
      else
        for (let j = 0; j < 3; j++) {
          cost += Math.pow(
            (this.patterns[bannerIndex].data.data[i * 4 + j] *
              ((this.patterns[bannerIndex].color >> ((2 - j) * 8)) & 0xff)) /
              256 -
              theirData[i * 4 + j],
            2
          );
        }
    }
    return cost;
  }

  mutated() {
    const newBanner = this.copy();
    const mutations = [
      () => {
        // insert
        const index = randomInteger(0, newBanner.patterns.length);
        newBanner.patterns = [
          ...newBanner.patterns.slice(0, index),
          randomPattern(),
          ...newBanner.patterns.slice(index),
        ];
      },
      () => {
        if (newBanner.patterns.length <= 1) return;
        // delete
        newBanner.patterns.splice(
          randomInteger(0, newBanner.patterns.length),
          1
        );
      },
      () => {
        // colorshift
        const randomPattern = randomElement(newBanner.patterns);
        randomPattern.color = randomElement(colors);
      },
      () => {
        // patternshift
        const randomPattern = randomElement(newBanner.patterns);
        randomPattern.data = randomElement(patternDatas);
      },
    ];

    do {
      randomElement(mutations)();
    } while (Math.random() < MUTATION_RATE);

    return newBanner;
  }
}

const patternDatas: ImageData[] = [];
const colors = [
  0x664c33, 0x191919, 0x4c4c4c, 0x999999, 0xffffff, 0xf27fa5, 0xb24cd8,
  0x7f3fb2, 0x334cb2, 0x4c7f99, 0x6699d8, 0x667f33, 0x7fcc19, 0xe5e533,
  0xd87f33, 0x993333,
];

const image = new Image(100, 320);
image.src = "/images/banners.png";

const reference = new Image(800, 800);
reference.src = "/images/reference.png";
let referenceDatas: ImageData[] = [];

const PATTERN_WIDTH = 20;
const PATTERN_HEIGHT = 40;

const banners: Banner[][] = [];

image.onload = () => {
  reference.onload = () => {
    c.drawImage(image, 0, 0);
    for (let x = 0; x < PATTERN_WIDTH * 5; x += PATTERN_WIDTH) {
      for (let y = 0; y < PATTERN_HEIGHT * 8; y += PATTERN_HEIGHT) {
        const pattern = c.getImageData(
          x,
          y,
          x + PATTERN_WIDTH,
          y + PATTERN_HEIGHT
        );
        patternDatas.push(pattern);
      }
    }

    c.drawImage(reference, 0, 0);
    for (let y = 0; y < canvas.height; y += PATTERN_HEIGHT) {
      for (let x = 0; x < canvas.width; x += PATTERN_WIDTH) {
        const localData = c.getImageData(x, y, PATTERN_WIDTH, PATTERN_HEIGHT);
        referenceDatas.push(localData);
        const banner = randomBanner();
        banners.push(
          Array(50)
            .fill(0)
            .map(() => banner.copy())
        );
      }
    }

    console.log("Begin...");

    const NUM_X_BANNERS = canvas.width / PATTERN_WIDTH;
    const NUM_Y_BANNERS = canvas.height / PATTERN_HEIGHT;

    let n = 0;

    const recursiveImprove = () => {
      console.log(n++);
      for (let y = 0; y < NUM_Y_BANNERS; y++) {
        for (let x = 0; x < NUM_X_BANNERS; x++) {
          const index = x + y * NUM_X_BANNERS;
          const bannerSet = banners[index];
          const data = referenceDatas[index];
          let mutated = bannerSet
            .map((banner) => banner.mutated())
            .map((banner) => ({
              banner,
              cost: banner.cost(data),
            }));
          mutated.sort((a, b) => a.cost - b.cost);
          let mutatedBanners = mutated.map((m) => m.banner);
          const topHalf = mutatedBanners.slice(0, mutatedBanners.length / 2);
          mutatedBanners = topHalf
            .map((banner) => banner.copy())
            .concat(topHalf.map((banner) => banner.copy()));

          banners[index] = mutatedBanners;

          if (n % 30 === 0)
            c.putImageData(
              mutatedBanners[0].data(),
              x * PATTERN_WIDTH,
              y * PATTERN_HEIGHT
            );
        }
      }
      setTimeout(recursiveImprove, 10);
    };

    setTimeout(recursiveImprove, 1000);
  };
};

const tinted = (data: ImageData, color: number) => {
  const result = new ImageData(data.width, data.height);
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = (color & 0xff0000) >> 16;
    result.data[i + 1] = (color & 0x00ff00) >> 8;
    result.data[i + 2] = color & 0x0000ff;
    result.data[i + 3] = data.data[i + 3];
  }
  return result;
};

const enumerate = (n: number) => {
  return [...Array(n).keys()];
};

const randomInteger = (inclusiveMin: number, exclusiveMax: number) =>
  inclusiveMin + Math.floor(Math.random() * (exclusiveMax - inclusiveMin));

const randomExp = (lambda: number) => -Math.log(1 - Math.random()) / lambda;

const randomElement = <T>(ts: T[]): T => ts[randomInteger(0, ts.length)];

const randomBanner = () => {
  const numPatterns = Math.ceil(randomExp(0.2));
  return new Banner(
    Array(numPatterns)
      .fill(0)
      .map(() => ({
        color: randomElement(colors),
        data: randomElement(patternDatas),
      }))
      .map((pattern) => ({
        ...pattern,
        canvas: imageFromData(pattern.data, pattern.color),
      }))
  );
};

const imageFromData = (data: ImageData, color: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const context = canvas.getContext("2d")!;
  context.putImageData(tinted(data, color), 0, 0);
  return canvas;
};

const randomPattern = (): Pattern => {
  const data = randomElement(patternDatas);
  const color = randomElement(colors);
  return {
    data,
    color,
  };
};

const expPick = <T>(ts: T[], n: number, l: number) => {
  let picked: number[] = [];
  let result: T[] = [];
  while (result.length < n) {
    const index = Math.floor(randomExp(l));
    if (!picked.includes(index) && index < ts.length) {
      result.push(ts[index]);
      picked.push(index);
    }
  }
  return result;
};

/*

Evolution process:

1. Selection: 
- Pick best half for selection and randomly assign parents.
- Choose indicies using exponential distribution to have a non-zero chance of
  lesser fit organisms to survive.
2. Recombination: 
- Order-based crossover?
-- Let n = min(n1, n2). Then, choose a random int c in [0, n) and 
   construct the banner [p1[0, c), p2[c, n)]
- Random crossover.
3. Mutation: One or more of the following:
- Adjust color of a pattern slightly (color adjacentcy will be defined).
- Add a new, random pattern.
- Remove a pattern (if there is at least one).
- Switch a pattern.
- Change the z-position of a pattern.

*/
