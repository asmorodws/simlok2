# PDF Template Documentation

## SIMLOK PDF Template

The SIMLOK PDF template is now separated from the API logic for easier management and customization.

### Location
- Template file: `src/utils/pdf/simlokTemplate.ts`
- API usage: `src/app/api/submissions/[id]/route.ts`

### Template Structure

The `SIMLOKPDFTemplate` class provides a structured way to generate PDF documents with the following sections:

1. **Header**: Document title and SIMLOK number
2. **Vendor Information**: Name, contact details, and document reference
3. **Work Details**: Job description, location, schedule, and worker names
4. **Execution Details**: Implementation timeline and additional details
5. **Content**: Job description with text wrapping
6. **Additional Information**: Miscellaneous details
7. **Document Information**: SIMJA and SIKA document references
8. **Approval Information**: Status, approver, and comments
9. **Distribution List**: Tembusan recipients

### Customization

To modify the PDF template:

1. Open `src/utils/pdf/simlokTemplate.ts`
2. Modify the `generateSIMLOKPDF` method to change layout, sections, or formatting
3. Adjust spacing, fonts, or positioning using the helper methods:
   - `addText()`: Add simple text
   - `addSection()`: Add titled sections
   - `addSimpleField()`: Add label-value pairs
   - `addMultiLineField()`: Add multi-line text fields
   - `addListField()`: Add numbered lists
   - `addWrappedText()`: Add text with automatic line wrapping

### Helper Methods

- `addSection(title, content, spacing)`: Creates a new section with title
- `addSimpleField(label, value)`: Adds a label: value line
- `addMultiLineField(label, value)`: Adds multi-line content with label
- `addListField(label, value)`: Adds numbered list from comma/newline-separated text
- `addWrappedText(content, maxWidth)`: Adds text with automatic word wrapping
- `formatDate(date)`: Formats dates consistently in Indonesian format

### Usage Example

```typescript
import { generateSIMLOKPDF, type SubmissionPDFData } from '@/utils/pdf/simlokTemplate';

// Generate PDF
const pdfBytes = await generateSIMLOKPDF(submissionData);

// Return as response
return new NextResponse(Buffer.from(pdfBytes), {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="document.pdf"',
  },
});
```

### Font and Layout Configuration

Current configuration:
- Page size: A4 (595.28 x 841.89 points)
- Margins: 50 points
- Fonts: Helvetica (regular and bold)
- Default font size: 12pt
- Title font size: 16pt

To modify these settings, adjust the values in the `initialize()` method and font references throughout the template.
