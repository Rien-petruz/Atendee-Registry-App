export default async (req: any, res: any) => {
  const { default: app } = await import("../artifacts/api-server/src/app.js");
  return app(req, res);
};
