import { Method } from './main';

export type MeasuredType = 'route' | 'middleware' | 'tracked-fn';
export type MeasurementItem = {
  method: Method;
  name: string;
  type: MeasuredType;
  path: string;
  millis: number;
};

export type Measurements = Record<
  string,
  {
    name: string;
    millis: number;
    count: number;
    errors: Record<number, { count: number; lastMessage: string }>;
    subMeasurements: Record<string, { name: string; millis: number; count: number }>;
  }
>;

type Portion = { start: number; width: number };

export interface FrontendMeasurements {
  measurements: {
    name: string;
    errorHighlights: string;
    errors: { statusCode: number; count: number; lastMessage: string }[];
    indents: number;
    count: number;
    averageMilis: number;
    totalMilis: number;
    portion: Portion;
    key: string;
    parentMillis: number;
    parentKey: string;
    parentPortionIndex: number;
  }[];
  parentPortions: Portion[];
}

let measurements: Measurements = {};

export function getMeasurements() {
  return measurements;
}

export function resetMeasurements() {
  measurements = {};
}

export function convertToFrontendMeasurements(measurements: Measurements): FrontendMeasurements {
  //sort parents
  //sort children
  //figure start, end of parents in a sorted way
  //figure start, end of children in a sorted way
  //gen error highlights of parents
  //add indents for children
  //add empty gaps as unknown
  const frontMeasurements: FrontendMeasurements['measurements'] = [];
  let totalMilis = 0;

  for (const parentKey in measurements) {
    const measurement = measurements[parentKey];
    totalMilis += measurement.millis;

    let errorCount = 0;
    Object.values(measurement.errors).forEach((value) => {
      if (value.count) errorCount += value.count;
    });

    frontMeasurements.push({
      name: measurement.name,
      errorHighlights: errorCount ? `${errorCount} Errors` : '',
      errors: Object.entries(measurement.errors).map(([code, e]) => ({ statusCode: Number(code), count: e.count, lastMessage: e.lastMessage })),
      indents: 0,
      count: measurement.count,
      averageMilis: measurement.millis / measurement.count,
      totalMilis: measurement.millis,
      parentMillis: measurement.millis,
      key: parentKey,
      parentKey: parentKey,

      portion: { start: 0, width: 0 },
      parentPortionIndex: -1,
    });

    for (const childKey in measurement.subMeasurements) {
      const childMeasurement = measurement.subMeasurements[childKey];

      frontMeasurements.push({
        name: childMeasurement.name,
        errorHighlights: '',
        errors: [],
        indents: 1,
        count: childMeasurement.count,
        averageMilis: childMeasurement.millis / measurement.count,
        totalMilis: childMeasurement.millis,
        parentMillis: measurement.millis,
        key: childKey,
        parentKey: parentKey,

        portion: { start: 0, width: 0 },
        parentPortionIndex: -1,
      });
    }
  }

  frontMeasurements.sort((m1, m2) => {
    //sort by parentTotalMillis, then by parent id, then by indents, then by totalMillis,
    if (m2.parentMillis !== m1.parentMillis) return m2.parentMillis - m1.parentMillis;
    if (m2.parentKey !== m1.parentKey) return m2.parentKey.localeCompare(m1.parentKey);
    if (m2.indents !== m1.indents) return m1.indents - m2.indents;
    return m2.totalMilis - m1.totalMilis;
  });

  //fill out parent.portions
  let currentPortion = 0;
  const parentPortions: Portion[] = [];
  for (let i = 0; i < frontMeasurements.length; i++) {
    const measurement = frontMeasurements[i];
    if (measurement.indents === 0) {
      const width = measurement.totalMilis / totalMilis;
      measurement.portion = { start: currentPortion, width: width };
      parentPortions.push(measurement.portion);
      measurement.parentPortionIndex = i;
      currentPortion += width;
    }
  }

  let currentParent: FrontendMeasurements['measurements'][0] | null = null;
  let childrenWidth = 0;
  for (let i = 0; i < frontMeasurements.length; i++) {
    const measurement = frontMeasurements[i];
    if (measurement.indents === 0) {
      currentParent = measurement;
      childrenWidth = 0;
    } else {
      if (currentParent) {
        const width = measurement.totalMilis / totalMilis;
        measurement.portion = { start: currentParent.portion.start + childrenWidth, width: width };
        measurement.parentPortionIndex = currentParent.parentPortionIndex;
        childrenWidth += width;
      }
    }
  }

  return { measurements: frontMeasurements, parentPortions };
}
