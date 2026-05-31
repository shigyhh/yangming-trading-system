const phonePattern = /^1\d{10}$/
const codePattern = /^\d{4,6}$/

export function isMainlandPhone(phone: string) {
  return phonePattern.test(phone)
}

export async function sendSmsCode(phone: string) {
  if (!isMainlandPhone(phone)) {
    throw new Error("请填写正确的手机号。")
  }

  await Promise.resolve()
}

export async function verifySmsCode(phone: string, code: string) {
  if (!isMainlandPhone(phone)) {
    throw new Error("请填写正确的手机号。")
  }

  if (!codePattern.test(code)) {
    throw new Error("请输入 4-6 位验证码。")
  }

  await Promise.resolve()
  return true
}
