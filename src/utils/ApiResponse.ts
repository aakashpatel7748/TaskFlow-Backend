class ApiResponse {
  public success: boolean;

  constructor(
    public statusCode: number,
    public data: unknown,
    public message: string = "Success",
  ) {
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
