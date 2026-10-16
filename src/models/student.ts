import { type InferSchemaType, type Model, model, models, Schema } from 'mongoose';

const studentSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        className: { type: String, required: true, trim: true },
        rollNo: { type: String, required: true, trim: true },
        hasBooked: { type: Boolean, default: false, index: true },
    },
    { timestamps: true },
);

studentSchema.index({ className: 1, rollNo: 1 }, { unique: true });

export type StudentDocument = InferSchemaType<typeof studentSchema>;

const StudentModel: Model<StudentDocument> = models.Student || model('Student', studentSchema);

export default StudentModel;
