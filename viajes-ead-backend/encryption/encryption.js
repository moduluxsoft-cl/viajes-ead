import crypto from "crypto";

export function encrypt(text, key) {
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null); // Modo ECB no usa IV
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
}

export function decrypt(encryptedText, key) {
    const decipher = crypto.createDecipheriv("aes-128-ecb", key, null); // Modo ECB no usa IV
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}


