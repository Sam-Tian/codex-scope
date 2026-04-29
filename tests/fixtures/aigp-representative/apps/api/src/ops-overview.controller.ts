const Controller = (_path?: string | string[]): ClassDecorator => () => undefined;
const Get = (_path?: string | string[]): MethodDecorator => () => undefined;

@Controller()
export class OpsOverviewController {
  @Get(["ops", "ops-overview", "ops/overview"])
  renderOverview(): string {
    return "overview";
  }

  @Get("ops-overview/report-archives")
  renderReportArchives(): string {
    return "archives";
  }
}
