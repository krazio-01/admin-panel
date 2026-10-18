import { type InferSchemaType, type Model, model, models, Schema } from 'mongoose';

const studentSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        group: { type: String, required: true, trim: true },
        idNumber: { type: String, required: true, trim: true },
        hasBooked: { type: Boolean, default: false, index: true },
    },
    { timestamps: true },
);

studentSchema.index({ group: 1, idNumber: 1 }, { unique: true });

export type StudentDocument = InferSchemaType<typeof studentSchema>;

const StudentModel: Model<StudentDocument> = models.Student || model('Student', studentSchema);

export default StudentModel;
