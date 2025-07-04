import mongoose from 'mongoose';
interface GlobalMongoose {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}
declare global {
    var mongooseGlobal: GlobalMongoose | undefined;
}
declare function dbConnect(): Promise<typeof mongoose>;
export default dbConnect;
//# sourceMappingURL=database.d.ts.map