class ApiError extends Error {
    constructor(
       public statusCode: number,
       public message: string = "Something went wrong",
       public errors: string[] = [],
       stack?: string ,
       public success = false,
        public data = null
    ){
        super(message)
       
        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export { ApiError }

