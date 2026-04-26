import type {
  ChartData,
  ChartCode,
  ChartSpan,
  LatenyContributor,
  ChartEndpoint,
} from './frontend-data-types';
import type { HandlerData, ResponseData, Span, SpanCode } from '../../shared-types/index';

const sum = <T>(getItem: (item: T) => number, ...items: T[]): number => {
  return items.reduce((sum, item) => sum + getItem(item), 0);
};

const safeDivide = (a: number, b: number): number => {
  return b === 0 ? 0 : a / b;
};

const round = (num: number, decimals: number = 0) => {
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
};

const mergeSpans = (...spans: Span[]): Span => {
  if (spans.length === 0) throw new Error('No spans to merge');
  return {
    codeId: spans[0].codeId,
    equivCodeSnippet: spans[0].equivCodeSnippet,
    totalMs: sum((s) => s.totalMs, ...spans),
    count: sum((s) => s.count, ...spans),
  };
};

const getUniqueKeys = <ItemType>(
  items: ItemType[],
  getKeys: (item: ItemType) => string[] = (item) => Object.keys(item),
): string[] => {
  const uniqueKeys = new Set<string>();
  for (const item of items) {
    const itemKeys = getKeys(item);
    for (const key of itemKeys) {
      uniqueKeys.add(key);
    }
  }
  return Array.from(uniqueKeys);
};

const mergeHandlerData = (...handlers: HandlerData[]): HandlerData => {
  const mergedConcDbCalls: HandlerData['concDbCalls'] = {};

  const concKeys = getUniqueKeys(handlers, (h) => Object.keys(h.concDbCalls));
  for (const concKey of concKeys) {
    const concDbCalls = handlers.map((h) => h.concDbCalls[concKey]).filter(Boolean);
    const dbKeys = getUniqueKeys(concDbCalls, (g) => Object.keys(g.dbCalls));

    mergedConcDbCalls[concKey] = {
      span: mergeSpans(...concDbCalls.map((concDbCall) => concDbCall.span)),
      dbCalls: {},
    };

    for (const dbKey of dbKeys) {
      const dbSpans = concDbCalls.map((concDbCall) => concDbCall.dbCalls[dbKey]).filter(Boolean);
      mergedConcDbCalls[concKey].dbCalls[dbKey] = mergeSpans(...dbSpans);
    }
  }

  return {
    span: mergeSpans(...handlers.map((h) => h.span)),
    concDbCalls: mergedConcDbCalls,
  };
};

const emptyResponseData: ResponseData = {
  backendId: '',
  currentInfo: {
    cpuPercent: 0,
    liveRequests: 0,
    memoryGB: 0,
    totalMemoryGB: 0,
  },
  spanCodes: {},
  endpoints: {},
};

function mergeBackendResponses(...backends: ResponseData[]): ResponseData {
  if (backends.length === 0) return emptyResponseData;

  const endpointKeys = getUniqueKeys(backends, (b) => Object.keys(b.endpoints));
  const mergedEndpoints: ResponseData['endpoints'] = {};

  for (const endPointKey of endpointKeys) {
    const epsForThisKey = backends.map((b) => b.endpoints[endPointKey]).filter(Boolean);
    const middlewareKeys = getUniqueKeys(epsForThisKey, (ep) => Object.keys(ep.middleWares));
    const mergedMiddleWares: ResponseData['endpoints'][string]['middleWares'] = {};

    for (const middlewareKey of middlewareKeys) {
      const middlewaresToMerge = epsForThisKey
        .map((ep) => ep.middleWares[middlewareKey])
        .filter(Boolean);
      mergedMiddleWares[middlewareKey] = mergeHandlerData(...middlewaresToMerge);
    }

    mergedEndpoints[endPointKey] = {
      method: epsForThisKey[0].method,
      path: epsForThisKey[0].path,
      span: mergeSpans(...epsForThisKey.map((ep) => ep.span)),
      middleWares: mergedMiddleWares,
      routeHandler: mergeHandlerData(...epsForThisKey.map((ep) => ep.routeHandler)),
    };
  }

  return {
    backendId: backends.map((b) => b.backendId).join('-'),
    //doesnt make sense, but incase an average is needed
    currentInfo: {
      cpuPercent: sum((b) => b.currentInfo.cpuPercent, ...backends),
      liveRequests: sum((b) => b.currentInfo.liveRequests, ...backends),
      memoryGB: sum((b) => b.currentInfo.memoryGB, ...backends),
      totalMemoryGB: sum((b) => b.currentInfo.totalMemoryGB, ...backends),
    },
    spanCodes: Object.assign({}, ...backends.map((b) => b.spanCodes)),
    endpoints: mergedEndpoints,
  };
}

function createEmptyChartData(): ChartData {
  return {
    currentInfos: {},
    totalLatency: 0,
    totalRequests: 0,
    latency: 0,
    prevTotalLatency: 0,
    prevTotalRequests: 0,
    prevLatency: 0,
    endPoints: [],
    contributors: [],
  };
}

function addSystemInfo(chart: ChartData, backends: ResponseData[]) {
  for (const backend of backends) {
    const { currentInfo, backendId } = backend;
    chart.currentInfos[backendId] = {
      backendId,
      requestsAtMoment: currentInfo.liveRequests,
      cpuPercent: currentInfo.cpuPercent,
      memoryPercent: safeDivide(currentInfo.memoryGB, currentInfo.totalMemoryGB) * 100,
      totalMemoryGB: currentInfo.totalMemoryGB,
    };
  }
}

const getTotals = (back: ResponseData) => {
  const endpoints = Object.values(back.endpoints);
  const totalLatency = sum((ep) => ep.span.totalMs, ...endpoints);
  const totalRequests = sum((ep) => ep.span.count, ...endpoints);
  const latency = round(safeDivide(totalLatency, totalRequests));
  return { totalLatency, totalRequests, latency };
};

function addOverallComparisons(
  chart: ChartData,
  prevChart: ChartData,
  curBack: ResponseData,
  prevBack: ResponseData,
) {
  const curTotals = getTotals(curBack);
  const prevTotals = getTotals(prevBack);

  chart.totalLatency = curTotals.totalLatency;
  chart.totalRequests = curTotals.totalRequests;
  chart.latency = curTotals.latency;

  chart.prevTotalLatency = prevTotals.totalLatency;
  chart.prevTotalRequests = prevTotals.totalRequests;
  chart.prevLatency = prevTotals.latency;

  prevChart.totalLatency = prevTotals.totalLatency;
  prevChart.totalRequests = prevTotals.totalRequests;
  prevChart.latency = prevTotals.latency;
}

const buildChartSpans = (endpoint: ResponseData['endpoints'][string]) => {
  const spans: ChartSpan[] = [];

  // middlewares
  for (const middleware of Object.values(endpoint.middleWares)) {
    spans.push({
      codeId: middleware.span.codeId,
      name: middleware.span.equivCodeSnippet,
      type: 'middleware',
      avgMs: safeDivide(middleware.span.totalMs, middleware.span.count),
      totalLatencyMs: middleware.span.totalMs,
      count: middleware.span.count,
    });
  }

  // route handler concurrent db calls
  for (const concKey in endpoint.routeHandler.concDbCalls) {
    const concCall = endpoint.routeHandler.concDbCalls[concKey];
    const dbCalls = Object.values(concCall.dbCalls);

    if (dbCalls.length === 1) {
      const dbCall = dbCalls[0];
      spans.push({
        codeId: dbCall.codeId,
        name: dbCall.equivCodeSnippet,
        type: 'db',
        avgMs: safeDivide(dbCall.totalMs, dbCall.count),
        totalLatencyMs: dbCall.totalMs,
        count: dbCall.count,
      });
    } else {
      spans.push({
        codeId: concCall.span.codeId,
        name: concCall.span.equivCodeSnippet,
        type: 'concurrent-db',
        avgMs: safeDivide(concCall.span.totalMs, concCall.span.count),
        totalLatencyMs: concCall.span.totalMs,
        count: concCall.span.count,
      });
    }
  }

  return spans;
};

function addEndpoints(chart: ChartData, backend: ResponseData) {
  const chartEndpoints: ChartData['endPoints'] = [];
  const { totalLatency } = getTotals(backend);

  for (const endpoint of Object.values(backend.endpoints)) {
    const current: ChartEndpoint = {
      totalRequests: endpoint.span.count,
      totalMs: endpoint.span.totalMs,
      lantencyContribution: safeDivide(endpoint.span.totalMs, totalLatency),
      method: endpoint.method || '',
      path: endpoint.path,
      errors: {},
      spans: buildChartSpans(endpoint),
    };

    chartEndpoints.push({ hidden: false, current, prev: null });
  }

  chartEndpoints.sort((a, b) => b.current.lantencyContribution - a.current.lantencyContribution);
  chart.endPoints = chartEndpoints;
}

const getOrCreateContributor = (
  codeId: string,
  type: LatenyContributor['type'],
  name: string,
  contributions: Record<string, LatenyContributor>,
): LatenyContributor => {
  if (!contributions[codeId]) {
    contributions[codeId] = {
      name,
      codeId,
      avgMs: 0,
      type,
      totalLatencyMs: 0,
      count: 0,
      code: null,
      subContributors: [],
    };
  }
  return contributions[codeId];
};

const addSubContribution = (parent: LatenyContributor, child: LatenyContributor) => {
  if (!parent.subContributors.find((c) => c.codeId === child.codeId))
    parent.subContributors.push(child);
};

const processConcDbContributions = (
  parent: LatenyContributor,
  concDbCall: HandlerData['concDbCalls'][string],
  contributions: Record<string, LatenyContributor>,
) => {
  const contribution = getOrCreateContributor(
    concDbCall.span.codeId,
    'concurrent-db',
    concDbCall.span.equivCodeSnippet,
    contributions,
  );
  contribution.totalLatencyMs += concDbCall.span.totalMs;
  contribution.count += concDbCall.span.count;
  contribution.avgMs = safeDivide(contribution.totalLatencyMs, contribution.count);

  for (const dbCall of Object.values(concDbCall.dbCalls)) {
    const dbContribution = getOrCreateContributor(
      dbCall.codeId,
      'db',
      dbCall.equivCodeSnippet,
      contributions,
    );
    dbContribution.totalLatencyMs += dbCall.totalMs;
    dbContribution.count += dbCall.count;
    dbContribution.avgMs = safeDivide(dbContribution.totalLatencyMs, dbContribution.count);
    addSubContribution(parent, dbContribution);
  }
};

const processHandlerContributions = (
  // parent:LatenyContributor //only downwards contributins neccessary
  handler: HandlerData,
  type: 'middleware' | 'route-handler',
  contributions: Record<string, LatenyContributor>,
) => {
  const contribution = getOrCreateContributor(
    handler.span.codeId,
    type,
    handler.span.equivCodeSnippet,
    contributions,
  );
  contribution.totalLatencyMs += handler.span.totalMs;
  contribution.count += handler.span.count;
  contribution.avgMs = safeDivide(contribution.totalLatencyMs, contribution.count);

  for (const concDbCall of Object.values(handler.concDbCalls)) {
    processConcDbContributions(contribution, concDbCall, contributions);
  }
};

function getAllContributions(backend: ResponseData): Record<string, LatenyContributor> {
  const contributions: Record<string, LatenyContributor> = {};

  for (const endpoint of Object.values(backend.endpoints)) {
    for (const middleware of Object.values(endpoint.middleWares)) {
      processHandlerContributions(middleware, 'middleware', contributions);
    }
    if (endpoint.routeHandler.span.count > 0) {
      processHandlerContributions(endpoint.routeHandler, 'route-handler', contributions);
    }
  }

  return contributions;
}

function fillInContributions(
  chart: ChartData,
  allContributions: Record<string, LatenyContributor>,
) {
  const seen = new Set<string>();

  for (const endpoint of chart.endPoints) {
    for (const span of endpoint.current.spans) {
      if (seen.has(span.codeId)) continue;
      seen.add(span.codeId);

      const contributor = allContributions[span.codeId];
      if (contributor) {
        chart.contributors.push({ hidden: false, prev: null, current: contributor });
      }
    }
  }
}

function fillInDetailedComparisons(
  prevChart: ChartData,
  curChart: ChartData,
  prevContributions: Record<string, LatenyContributor>,
) {
  const curEndpointsMap = new Map(
    curChart.endPoints.map((e) => [`${e.current.method}_${e.current.path}`, e]),
  );

  for (const { current: prevEndpoint } of prevChart.endPoints) {
    const key = `${prevEndpoint.method}_${prevEndpoint.path}`;

    const curEndpointWrap = curEndpointsMap.get(key);
    if (curEndpointWrap) {
      curEndpointWrap.prev = prevEndpoint;

      const currSpanIds = new Set(curEndpointWrap.current.spans.map((s) => s.codeId));
      for (const oldSpan of prevEndpoint.spans) {
        if (!currSpanIds.has(oldSpan.codeId)) {
          oldSpan.type = 'other';
        }
      }
    } else {
      for (const oldSpan of prevEndpoint.spans) {
        oldSpan.type = 'other';
      }
      curChart.endPoints.push({
        hidden: false,
        current: null,
        prev: prevEndpoint,
      });
    }
  }

  for (const contribObj of curChart.contributors) {
    const prevMatch = prevContributions[contribObj.current.codeId];
    if (prevMatch) {
      contribObj.prev = prevMatch;
    }
  }
}

function hideLessImportant(
  chart: ChartData,
  defaultEndpoints: number = 5,
  defaultContributors: number = 3,
) {
  chart.endPoints.sort((a, b) => {
    const aContrib = a.current?.lantencyContribution ?? 0;
    const bContrib = b.current?.lantencyContribution ?? 0;
    return bContrib - aContrib;
  });

  chart.endPoints.forEach((ep, index) => {
    ep.hidden = index >= defaultEndpoints;
  });

  chart.contributors.sort((a, b) => b.current.totalLatencyMs - a.current.totalLatencyMs);

  chart.contributors.forEach((contrib, index) => {
    contrib.hidden = index >= defaultContributors;
  });
}

export function getChartData(
  curBackendResponses: Record<string, ResponseData>,
  prevBackendResponses: Record<string, ResponseData>,
): ChartData {
  const mergedBack = mergeBackendResponses(...Object.values(curBackendResponses));
  const prevMergedBack = mergeBackendResponses(...Object.values(prevBackendResponses));

  const curChart = createEmptyChartData();
  const prevChart = createEmptyChartData();

  addSystemInfo(curChart, Object.values(curBackendResponses));
  addSystemInfo(prevChart, Object.values(prevBackendResponses));

  //add overall comparisons
  addOverallComparisons(curChart, prevChart, mergedBack, prevMergedBack);

  //add endpoints
  addEndpoints(curChart, mergedBack);
  addEndpoints(prevChart, prevMergedBack);

  //get all contributions
  const curContributions = getAllContributions(mergedBack);
  const prevContributions = getAllContributions(prevMergedBack);

  //fill in contributions
  fillInContributions(curChart, curContributions);
  fillInContributions(prevChart, prevContributions);

  //add detailed comparisons
  fillInDetailedComparisons(prevChart, curChart, prevContributions);

  //hide less important
  hideLessImportant(curChart);

  return curChart;
}
