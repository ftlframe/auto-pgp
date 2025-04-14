export const formatDate = (dateInput: string | Date | null): string => {
    if (!dateInput) return 'Never'; // Or 'No Expiry'
    try {
        // Ensure we have a Date object, parsing if it's a string
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        // Basic check if the date is valid after parsing/creation
        if (isNaN(date.getTime())) return 'Invalid Date';
        // Format using browser's locale settings
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        // Catch potential errors with Date parsing/formatting
        return 'Invalid Date';
    }
};