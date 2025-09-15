export function extractKeysFromObj(obj: { [key: string]: any }, keys: string[]): null | { [key: string]: any } {
    if (!obj) {
        return null;
    }
    if (!keys.length) {
        return null;
    }
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
};

export function formatPhoneNumber(phoneNumber: string): string {
    let phone = `${String(phoneNumber).replace(/\s/g, '')}`;
    let number = phone.match(/(3[0-9]*)/g);
    return Array.isArray(number) && number[0].length >= 10
        ? number[0]
        : phoneNumber;
};
