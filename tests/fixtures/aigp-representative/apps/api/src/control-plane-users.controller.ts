const Controller = (_path?: string | string[]): ClassDecorator => () => undefined;
const Get = (_path?: string | string[]): MethodDecorator => () => undefined;
const Patch = (_path?: string | string[]): MethodDecorator => () => undefined;
const Post = (_path?: string | string[]): MethodDecorator => () => undefined;

@Controller()
export class ControlPlaneUsersController {
  @Get("api/control-plane-users")
  listUsers(): string {
    return "users";
  }

  @Post("api/control-plane-users")
  createUser(): string {
    return "created";
  }

  @Patch("api/control-plane-users/:userId/status")
  updateStatus(): string {
    return "updated";
  }

  @Get("ops/control-plane-users")
  renderUsers(): string {
    return "page";
  }
}
