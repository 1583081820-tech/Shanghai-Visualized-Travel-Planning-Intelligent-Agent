"""
RAG 检索增强生成链
使用 LangChain LCEL 语法构建完整的 RAG 链路
包含：检索 -> 提示词 -> 大模型 -> 结构化输出
"""
import os
from typing import List, Optional

# 设置 HuggingFace 国内镜像（解决下载慢/连不上的问题）
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_openai import ChatOpenAI
from sentence_transformers import SentenceTransformer
from loguru import logger

from app.core.config import settings
from app.schemas.chat import TravelPlanSchema


# ==============================================
# 自定义嵌入模型（避免 langchain-huggingface 版本冲突）
# ==============================================
class LocalEmbeddings(Embeddings):
    """本地 sentence-transformers 嵌入模型"""

    def __init__(self, model_name: str, device: str = "cpu", cache_folder: str = None):
        self.model = SentenceTransformer(
            model_name_or_path=model_name,
            device=device,
            cache_folder=cache_folder,
        )

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """嵌入文档列表"""
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> List[float]:
        """嵌入查询文本"""
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()


# ==============================================
# 1. 初始化嵌入模型
# ==============================================
def get_embeddings() -> LocalEmbeddings:
    """获取嵌入模型实例（单例）"""
    if not hasattr(get_embeddings, "_instance"):
        logger.info(f"🔄 正在加载嵌入模型: {settings.EMBEDDING_MODEL}")
        cache_dir = os.path.join(os.path.dirname(__file__), "../../models")
        get_embeddings._instance = LocalEmbeddings(
            model_name=settings.EMBEDDING_MODEL,
            device=settings.EMBEDDING_DEVICE,
            cache_folder=cache_dir,
        )
        logger.info("✅ 嵌入模型加载完成")
    return get_embeddings._instance


# ==============================================
# 2. 初始化 FAISS 向量库
# ==============================================
def get_vector_store() -> FAISS:
    """获取 FAISS 向量库实例（本地文件模式）"""
    if not hasattr(get_vector_store, "_instance"):
        index_path = settings.FAISS_INDEX_PATH
        index_name = settings.FAISS_INDEX_NAME

        # 检查本地是否已有索引
        index_file = os.path.join(index_path, f"{index_name}.faiss")

        if os.path.exists(index_file):
            # 加载已有索引
            logger.info(f"📂 正在加载 FAISS 向量索引: {index_path}")
            get_vector_store._instance = FAISS.load_local(
                folder_path=index_path,
                embeddings=get_embeddings(),
                index_name=index_name,
                allow_dangerous_deserialization=True,
            )
            logger.info("✅ FAISS 向量索引加载完成")
        else:
            # 创建新索引（用一条默认文档初始化）
            logger.info(f"🆕 正在创建新的 FAISS 向量索引: {index_path}")
            os.makedirs(index_path, exist_ok=True)

            # 默认文档（占位用，后续可以通过导入知识库替换）
            default_texts = [
                "上海是中国的经济中心和国际化大都市，拥有丰富的旅游资源。",
                "上海著名景点包括外滩、东方明珠、豫园、迪士尼乐园、南京路步行街等。",
                "上海特色美食有小笼包、生煎包、本帮菜、红烧肉等。",
            ]
            default_metadatas = [
                {"city": "上海", "category": "概述"},
                {"city": "上海", "category": "景点"},
                {"city": "上海", "category": "美食"},
            ]

            get_vector_store._instance = FAISS.from_texts(
                texts=default_texts,
                embedding=get_embeddings(),
                metadatas=default_metadatas,
            )

            # 保存到本地
            get_vector_store._instance.save_local(
                folder_path=index_path,
                index_name=index_name,
            )
            logger.info("✅ FAISS 向量索引创建完成并已保存")

    return get_vector_store._instance


def get_retriever(city: Optional[str] = None, top_k: int = 2):
    """获取检索器
    注意：FAISS 本地模式的 metadata 过滤功能有限，目前默认返回 top_k 个结果
    优化：减少top_k数量，加快检索速度
    """
    vector_store = get_vector_store()

    search_kwargs = {"k": top_k}
    # FAISS 基础版不支持高效的 metadata 过滤
    # 如需过滤，可以考虑使用 Chroma 或其他向量数据库

    return vector_store.as_retriever(search_kwargs=search_kwargs)


# ==============================================
# 3. 初始化大模型
# ==============================================
def get_llm(temperature: float = 0.7) -> ChatOpenAI:
    """获取大模型实例"""
    return ChatOpenAI(
        model=settings.DOUBAO_MODEL,
        api_key=settings.DOUBAO_API_KEY,
        base_url=settings.DOUBAO_BASE_URL,
        temperature=temperature,
        streaming=True,
    )


# ==============================================
# 4. 结构化输出解析器
# ==============================================
plan_parser = PydanticOutputParser(pydantic_object=TravelPlanSchema)


# ==============================================
# 5. 提示词模板
# ==============================================
# 行程规划提示词
PLAN_PROMPT = ChatPromptTemplate.from_template("""
你是一位专业的上海旅游规划师，拥有丰富的本地旅游知识和规划经验。

请根据用户的需求，为其制定一份详细、合理、实用的旅行行程规划。

【用户需求】
{query}

【行程天数】{days} 天
【出行人群】{crowd}
【目的地城市】{city}

【本地知识库参考】
{context}

【要求】
1. 行程安排要合理，避免过于紧凑或松散
2. 考虑交通便利性，尽量减少往返路程
3. 结合当地特色，推荐地道的美食和景点
4. 注意不同人群的需求（如老人、小孩、情侣等）
5. 每天的行程要有明确的主题
6. 给出实用的贴士和避坑建议

{format_instructions}
""")

# 普通对话提示词
CHAT_PROMPT = ChatPromptTemplate.from_template("""
你是一位亲切、专业的上海旅游顾问，名字叫"小沪"。

请用友好、热情的语气回答用户关于上海旅游的问题。
如果用户的问题涉及具体的景点、美食、交通等，请结合本地知识库给出准确实用的回答。

【历史对话】
{chat_history}

【本地知识库参考】
{context}

【用户问题】
{question}

请用中文回答，回答要简洁实用，重点突出。
""")


# ==============================================
# 6. 构建 RAG 链（LCEL 语法）
# ==============================================
def format_docs(docs) -> str:
    """格式化检索到的文档"""
    return "\n\n".join([doc.page_content for doc in docs])


def build_plan_chain():
    """构建行程规划 RAG 链（带结构化输出）"""
    retriever = get_retriever()

    chain = (
        {
            "query": RunnablePassthrough(),
            "days": lambda x: x.get("days", 3) if isinstance(x, dict) else 3,
            "crowd": lambda x: x.get("crowd", "成人") if isinstance(x, dict) else "成人",
            "city": lambda x: x.get("city", "上海") if isinstance(x, dict) else "上海",
            "context": RunnableLambda(lambda x: x.get("query", x) if isinstance(x, dict) else x) | retriever | format_docs,
            "format_instructions": lambda _: plan_parser.get_format_instructions(),
        }
        | PLAN_PROMPT
        | get_llm(temperature=0.8)
        | plan_parser
    )
    return chain


def build_chat_chain():
    """构建普通对话 RAG 链"""
    retriever = get_retriever()

    chain = (
        {
            "question": RunnablePassthrough(),
            "chat_history": lambda x: x.get("chat_history", "") if isinstance(x, dict) else "",
            "context": RunnableLambda(lambda x: x.get("question", x) if isinstance(x, dict) else x) | retriever | format_docs,
        }
        | CHAT_PROMPT
        | get_llm(temperature=0.7)
    )
    return chain


# ==============================================
# 7. 便捷调用函数
# ==============================================
def generate_travel_plan(query: str, days: int = 3, crowd: str = "成人", city: str = "上海") -> TravelPlanSchema:
    """生成结构化的行程规划"""
    logger.info(f"🗺️ 正在生成行程规划: {days}天, {crowd}, {query[:50]}...")
    chain = build_plan_chain()
    result = chain.invoke({
        "query": query,
        "days": days,
        "crowd": crowd,
        "city": city,
    })
    logger.info("✅ 行程规划生成完成")
    return result


def chat_with_rag(question: str, chat_history: str = "") -> str:
    """带 RAG 的对话"""
    chain = build_chat_chain()
    result = chain.invoke({
        "question": question,
        "chat_history": chat_history,
    })
    return result.content
