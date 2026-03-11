/**
 * @swagger
 * /api/health:
 *   get:
 *     description: Health status
 *     responses:
 *       200:
 *         description: Hello World!
 */
export async function GET() {
  return Response.json({ message: "Hello World!" });
}
