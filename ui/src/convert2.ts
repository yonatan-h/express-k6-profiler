import type { ResponseData } from '../../shared/types';

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
