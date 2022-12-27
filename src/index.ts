const canvas = document.querySelector("canvas")!;
canvas.width = 200;
canvas.height = 400;
const c = canvas.getContext("2d")!;

type Pattern = {
  colorIndex: number;
  patternIndex: number;
};

type Banner = Pattern[];

const patterns: ImageData[] = [];
const colors = [
  0x664c33, 0x191919, 0x4c4c4c, 0x999999, 0xffffff, 0xf27fa5, 0xb24cd8,
  0x7f3fb2, 0x334cb2, 0x4c7f99, 0x6699d8, 0x667f33, 0x7fcc19, 0xe5e533,
  0xd87f33, 0x993333,
];

const image = new Image(100, 320);
image.src = "/images/banners.png";

const reference = new Image(20, 40);
reference.src = "/images/reference.png";
let referenceData: ImageData;

const PATTERN_WIDTH = 20;
const PATTERN_HEIGHT = 40;

const banners: Banner[] = [];

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
        // const patternCanvas = document.createElement("canvas");
        // patternCanvas.width = PATTERN_WIDTH;
        // patternCanvas.height = PATTERN_HEIGHT;
        // const patternCanvasC = patternCanvas.getContext("2d")!;
        // patternCanvasC.putImageData(
        //   tinted(pattern, Math.floor(Math.random() * 0xffffff)),
        //   0,
        //   0
        // );
        patterns.push(pattern);
      }
    }

    c.clearRect(0, 0, canvas.width, canvas.height);

    // for (let x = 0; x < canvas.width; x += PATTERN_WIDTH) {
    //   for (let y = 0; y < canvas.height; y += PATTERN_HEIGHT) {
    //     drawBanner(randomBanner(), x, y);
    //   }
    // }

    c.drawImage(reference, 0, 0);
    referenceData = c.getImageData(0, 0, 20, 40);

    // let bestBanner: Banner | undefined = undefined;
    // let lowestFitness: number = Infinity;

    // for (let i = 0; i < 100; i++) {
    //   const banner = randomBanner();
    //   const bannerFitness = fitness(banner);
    //   if (bannerFitness < lowestFitness) {
    //     lowestFitness = bannerFitness;
    //     bestBanner = banner;
    //   }
    // }

    // drawBanner(bestBanner!, 0, 0);
    // console.log(lowestFitness);
    for (let i = 0; i < 100; i++) {
      banners.push(randomBanner());
    }
    evolutionStep(banners);
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

const drawBanner = (banner: Banner, x: number, y: number) => {
  for (let pattern of banner) {
    const color = colors[pattern.colorIndex];
    const patternData = patterns[pattern.patternIndex];
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = PATTERN_WIDTH;
    patternCanvas.height = PATTERN_HEIGHT;
    const patternCanvasC = patternCanvas.getContext("2d")!;
    patternCanvasC.putImageData(tinted(patternData, color), 0, 0);
    c.drawImage(patternCanvas, x, y);
  }
};

const randomPattern = (): Pattern => {
  return {
    colorIndex: Math.floor(Math.random() * colors.length),
    patternIndex: Math.floor(Math.random() * patterns.length),
  };
};

const randomBanner = (): Banner => {
  const banner: Banner = [];
  for (let i = 0; i < 10; i++) {
    banner.push(randomPattern());
  }
  return banner;
};

let numberFitness = 0;

const fitness = (banner: Banner) => {
  c.clearRect(0, 0, 20, 40);
  drawBanner(banner, 0, 0);
  const data = c.getImageData(0, 0, 20, 40);
  let fitness = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    fitness += Math.abs(data.data[i] - referenceData.data[i]);
    fitness += Math.abs(data.data[i + 1] - referenceData.data[i + 1]);
    fitness += Math.abs(data.data[i + 2] - referenceData.data[i + 2]);
    // fitness += Math.abs(data.data[i] - 255 * (i / data.data.length));
    // fitness += Math.abs(data.data[i + 1]);
    // fitness += Math.abs(data.data[i + 2]);
  }
  return fitness;
};

const cloneBanner = (banner: Banner) => {
  const newBanner: Banner = [];
  for (let pattern of banner) {
    newBanner.push({
      colorIndex: pattern.colorIndex,
      patternIndex: pattern.patternIndex,
    });
  }
  return newBanner;
};

const MUTATION_RATE = 0.1;

const mutate = (banner: Banner) => {
  let newBanner = cloneBanner(banner);
  const mutation = Math.floor(Math.random() * 4);
  if (mutation == 0)
    do {
      // Insert
      const index = Math.floor(Math.random() * newBanner.length);
      newBanner = [
        ...newBanner.slice(0, index),
        randomPattern(),
        ...newBanner.slice(index, newBanner.length),
      ];
    } while (Math.random() < MUTATION_RATE);
  if (mutation == 1)
    do {
      // Delete
      const index = Math.floor(Math.random() * newBanner.length);
      newBanner.splice(index, 1);
    } while (Math.random() < MUTATION_RATE);
  if (mutation == 2)
    do {
      // Colorshift
      const index = Math.floor(Math.random() * newBanner.length);
      if (Math.random() < 0.5) newBanner[index].colorIndex += 1;
      else newBanner[index].colorIndex -= 1;
      newBanner[index].colorIndex %= colors.length;
      if (newBanner[index].colorIndex < 0)
        newBanner[index].colorIndex += colors.length;
    } while (Math.random() < MUTATION_RATE);
  if (mutation == 3)
    do {
      // Patternshift
      const index = Math.floor(Math.random() * newBanner.length);
      if (Math.random() < 0.5) newBanner[index].patternIndex += 1;
      else newBanner[index].patternIndex -= 1;
      newBanner[index].patternIndex %= patterns.length;
      if (newBanner[index].patternIndex < 0)
        newBanner[index].patternIndex += patterns.length;
    } while (Math.random() < MUTATION_RATE);
  return newBanner;
};

const drawAll = (banners: Banner[]) => {
  let i = 0;
  for (let y = 0; y < canvas.height; y += PATTERN_HEIGHT) {
    for (let x = 0; x < canvas.width; x += PATTERN_WIDTH) {
      drawBanner(banners[i++], x, y);
    }
  }
};

const evolutionStep = (population: Banner[]) => {
  const fitnesses = population.map((b) => ({
    banner: b,
    fitness: fitness(b),
  }));
  fitnesses.sort((a, b) => a.fitness - b.fitness);
  const sortedBanners = fitnesses.map((it) => it.banner);
  drawAll(sortedBanners);
  const firstHalf = sortedBanners.slice(0, 50);
  setTimeout(
    () => evolutionStep([...firstHalf, ...firstHalf.map((it) => mutate(it))]),
    1000
  );
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
