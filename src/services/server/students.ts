import 'server-only';
import type { Types } from 'mongoose';
import Papa from 'papaparse';
import { connectDb } from '@/lib/db';
import { ValidationError } from '@/lib/errors';
import { StudentModel, type StudentDocument } from '@/models';

export type StudentOption = { id: string; name: string; group: string; idNumber: string };

export type ImportResult = {
    inserted: number;
    skipped: number;
    errors: { line: number; reason: string }[];
};

type AvailableStudentRow = Pick<StudentDocument, 'name' | 'group' | 'idNumber'> & {
    _id: Types.ObjectId;
};

const MAX_IMPORT_ROWS = 5000;
const MAX_REPORTED_ERRORS = 50;

const HEADER_ALIASES: Record<string, 'name' | 'group' | 'idNumber'> = {
    name: 'name',
    studentname: 'name',
    group: 'group',
    idnumber: 'idNumber',
    id: 'idNumber',
};

function canonicalHeader(header: string): string {
    const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
    return HEADER_ALIASES[normalized] ?? normalized;
}

export async function listAvailableStudents(): Promise<StudentOption[]> {
    await connectDb();

    const students = await StudentModel.find({ hasBooked: false }, 'name group idNumber', {
        sort: { group: 1, name: 1 },
        collation: { locale: 'en', numericOrdering: true },
    }).lean<AvailableStudentRow[]>();

    return students.map((student) => ({
        id: String(student._id),
        name: student.name,
        group: student.group,
        idNumber: student.idNumber,
    }));
}

export async function importStudentsCsv(csvText: string): Promise<ImportResult> {
    await connectDb();

    const parsed = Papa.parse<Record<string, string | undefined>>(csvText.replace(/^﻿/, ''), {
        header: true,
        skipEmptyLines: false,
        transformHeader: canonicalHeader,
    });

    const quoteError = parsed.errors.find((error) => error.type === 'Quotes');
    if (quoteError) {
        throw new ValidationError([
            { path: 'csv', message: `Malformed quoting near line ${(quoteError.row ?? 0) + 1}` },
        ]);
    }

    const missingColumns = (['name', 'group', 'idNumber'] as const).filter(
        (column) => !parsed.meta.fields?.includes(column),
    );
    if (missingColumns.length > 0) {
        throw new ValidationError([
            { path: 'csv', message: 'The file needs the columns: name, group, id number' },
        ]);
    }

    if (parsed.data.length > MAX_IMPORT_ROWS) {
        throw new ValidationError([
            { path: 'csv', message: `Import at most ${MAX_IMPORT_ROWS} rows at a time` },
        ]);
    }

    const errors: ImportResult['errors'] = [];
    const operations: Parameters<typeof StudentModel.bulkWrite>[0] = [];
    parsed.data.forEach((row, index) => {
        if (Object.values(row).every((value) => (value ?? '').trim() === '')) return;

        const name = row.name?.trim() ?? '';
        const group = row.group?.trim() ?? '';
        const idNumber = row.idNumber?.trim() ?? '';
        const invalid =
            !name ||
            !group ||
            !idNumber ||
            name.length > 100 ||
            group.length > 40 ||
            idNumber.length > 40;

        if (invalid) {
            if (errors.length < MAX_REPORTED_ERRORS) {
                errors.push({ line: index + 2, reason: 'Name, group and ID number are required' });
            }

            return;
        }

        operations.push({
            updateOne: {
                filter: { group, idNumber },
                update: { $setOnInsert: { name, hasBooked: false } },
                upsert: true,
            },
        });
    });

    const inserted = operations.length
        ? (await StudentModel.bulkWrite(operations, { ordered: false })).upsertedCount
        : 0;

    return { inserted, skipped: operations.length - inserted, errors };
}
